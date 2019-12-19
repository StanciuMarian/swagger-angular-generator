import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {UserDto} from './dtos/UserDto'

@Injectable({providedIn: 'root'})
export class userService {

    constructor(private http: HttpClient) {}

    getCurrentUser(): Observable<UserDto> {
        return this.http.get<UserDto>(`http://localhost:8080/api/current-user`);
    }
}