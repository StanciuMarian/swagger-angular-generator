import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {StoreDto} from './dtos/StoreDto'
import {CountryDto} from './dtos/CountryDto'
import {CityDto} from './dtos/CityDto'
import {CouponForm} from './dtos/CouponForm'

@Injectable({providedIn: 'root'})
export class appService {

    constructor(private http: HttpClient) {}

    getStoresByCity(cityId: number): Observable<StoreDto[]> {
        return this.http.get<StoreDto[]>(`http://localhost:8080/api/cities/${cityId}/stores`);
    }

	getAllCountries(): Observable<CountryDto[]> {
        return this.http.get<CountryDto[]>(`http://localhost:8080/api/countries`);
    }

	getCitiesByCountry(countryIso: string): Observable<CityDto[]> {
        return this.http.get<CityDto[]>(`http://localhost:8080/api/countries/${countryIso}/cities`);
    }

	validateReceiptId(receiptId: string, storeId: number): Observable<void> {
        return this.http.get<void>(`http://localhost:8080/api/validateReceiptId?receiptId=${receiptId}&storeId=${storeId}`);
    }
}