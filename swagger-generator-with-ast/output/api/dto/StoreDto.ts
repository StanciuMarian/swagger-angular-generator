export class StoreDto {
    code: number;
    name: string;
    storeTypeName: string;

    nameWithType(): string {
        return this.name + " - " + this.storeTypeName;
    }
}
