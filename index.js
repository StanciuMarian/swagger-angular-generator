const Axios = require("axios");
const fs = require("fs");

const apiURL = 'http://localhost:8080'
const swaggerURL = `${apiURL}/v2/api-docs`;

Axios.get(swaggerURL)
    .then(response => parseSwaggerJSON(response.data))
    .catch(() => console.log('Impossible to read json for parsing from ' + swaggerURL));

function parseSwaggerJSON(swaggerJSON) {
    generateTypes(swaggerJSON.definitions);
    generateServices(swaggerJSON.paths);
}

function generateTypes(definitions) {
    for(const definition of Object.values(definitions)) {
        const {typeName, body} = parseDefinition(definition);
        writeToFile("./dtos/" + typeName, body);
    }
}

function generateServices(paths) {
    let pathsByTag = groupPathsByTag(paths)
    console.log(JSON.stringify(Array.from(pathsByTag.values())))
    for(let tag of pathsByTag.keys()) {
        const methodsMetadata = getMetadataAboutMethods(pathsByTag.get(tag));
        const typesToBeImported = getTypesToBeImported(methodsMetadata);
        const serviceName = tag.split("-")[0] + "Service";
        const serviceDefinition = getServiceDefinition(serviceName, methodsMetadata, typesToBeImported);
        writeToFile(serviceName, serviceDefinition)
    }
}

function groupPathsByTag(originalPaths) {
    const map = new Map();
    for(const endpoint in originalPaths) {
        const endpointMethods = Object.keys(originalPaths[endpoint]).map(httpMethod => ({endpoint, httpMethod, ...originalPaths[endpoint][httpMethod]}));
        const tag = endpointMethods[0].tags[0];
        const endpointsForTag = map.get(tag);
        
        if(!endpointsForTag) {
            map.set(tag, endpointMethods);
        } else {
            map.set(tag, endpointsForTag.concat(endpointMethods));
        }
    }
    return map;
}

function getMetadataAboutMethods(paths) {
    return paths.map(path => ({
        endpoint: path.endpoint,
        httpMethod: path.httpMethod,
        methodName: path.summary,
        parameters: getParameters(path),
        returnType: getReturnType(path)
    }))
}

function getTypesToBeImported(methodsMetadata) {
    let definitionToBeImported = [];
    for(const methodMetadata of methodsMetadata) {
        const returnType = methodMetadata.returnType.replace('[]', '');
        if(isNotPrimitiveType(returnType)) {
            definitionToBeImported.push(returnType);
        }
        parametersTypes = methodMetadata.parameters.map(param => param.type.replace('[]', '')).filter(type => isNotPrimitiveType(type));
        definitionToBeImported = definitionToBeImported.concat(parametersTypes);
    }
    return definitionToBeImported;
}

function getServiceDefinition(serviceName, methodsMetadata, typesToBeImported) {
    const service = 
`import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
${getImports(typesToBeImported)}

@Injectable({providedIn: 'root'})
export class ${serviceName} {

    constructor(private http: HttpClient) {}

    ${getMethodsBody(methodsMetadata)}
}`
return service;
}

function getImports(typesToBeImported) {
    return typesToBeImported.map(type => `import {${type}} from './dtos/${type}'`).join('\n');
}

function getMethodsBody(methodsMetadata) {
    const methodsBody = []
    for(const methodMetadata of methodsMetadata) {
        if(methodMetadata.httpMethod == 'get') {
            methodsBody.push(getBodyForGET(methodMetadata));
        }
    }
    return methodsBody.join('\n\n\t');
}

function getBodyForGET(methodMetadata) {
    let endpoint = getEndpoint(methodMetadata);
    const methodParameters = getMethodParameters(methodMetadata.parameters)

    return `${methodMetadata.methodName}(${methodParameters}): Observable<${methodMetadata.returnType}> {
        return this.http.get<${methodMetadata.returnType}>(\`${apiURL}${endpoint}\`);
    }`
}

function getEndpoint(methodMetadata) {
    let endpoint = methodMetadata.endpoint.replace(new RegExp("{", "g"), '${');
    const queryParams = getQueryParams(methodMetadata.parameters);
    if(queryParams) {
        endpoint += '?' + queryParams;
    }
    return endpoint;
}

function getMethodParameters(parameters) {
    return parameters.map(param => param.name + ': ' + param.type).join(", ")
}

function getQueryParams(parameters) {
    return parameters.filter(param => param.httpType == 'query').map(param => `${param.name}=\${${param.name}}`).join('&');
}

function isNotPrimitiveType(type) {
    return type != 'string' && type != 'number' && type != 'boolean' && type != 'any' && type != 'void';
}

function getReturnType(path) {
    const schema = path.responses['200'].schema;
    if(!schema) {
        return 'void';
    }

    switch (String(schema.type)) {
        case 'array': return (schema.items.type || schema.items["$ref"].split('/').pop() || 'any') + '[]';
        case 'integer': return 'number';
        case 'object': return 'any'
        case 'undefined': return schema["$ref"].split('/').pop()
        default: return schema.type;
    }
}

function getParameters(path) {
    if(!path.parameters) {
        return [];
    }
    return path.parameters.map(parameter => ({
        name: parameter.name,
        httpType: parameter.in,
        type: getPropertyType(parameter)
    }))
}







function parseDefinition(definition) {
    const typeName = definition.title;
    const properties = getPropertiesForDefinition(definition)
    const definitionBody = getDefinitionBody(properties);

    const body = 
`export class ${typeName} {
    ${definitionBody}
}`;
    return {typeName, body};
}

function getPropertiesForDefinition(definition) {
    const properties = [];
    for(const name of Object.keys(definition.properties)) {
        const type = definition.properties[name].type;
        properties.push({name, type})
    }
    return properties;
}

function getDefinitionBody(properties) {
    return properties.map(property => `${property.name}: ${getPropertyType(property)};`).join("\n\t")
}



function getPropertyType(property) {
    switch(String(property.type)) {
        case 'integer': return 'number'
        case 'array': return property.items.type + '[]'
        case 'undefined': return resolvePropertyTypeBySchema(property.schema)
        default: return property.type
    }
}

function resolvePropertyTypeBySchema(schema) {
    if(schema.type) {
        if(schema.type == 'integer') {
            return 'number';
        }
        return schema.type;
    } else if(schema["$ref"]) {
        return schema["$ref"].split('/').pop() 
    } else {
        return schema.items["$ref"].split('/').pop() + '[]';
    }
}

function writeToFile(filename, string) {
    fs.writeFile(`${filename}.ts`, string, (e) => console.log(`${filename} ready!`))
}
