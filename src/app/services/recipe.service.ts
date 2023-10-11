import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Recipe } from '../models/recipe';

import { environment } from '../../environments/environment';
import { RecipeSearch } from '../models/reciepe-search';

@Injectable({ providedIn: 'root' })
export class RecipeService {
    private recipeSubject: BehaviorSubject<Recipe | null>;
    public recipe: Observable<Recipe | null>;

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        this.recipeSubject = new BehaviorSubject(JSON.parse(localStorage.getItem('recipie')!));
        this.recipe = this.recipeSubject.asObservable();
    }

    public get recipeValue() {
        return this.recipeSubject.value;
    }

    create(recipe: Recipe) {
        return this.http.post(`${environment.apiUrl}/recipes/create`, recipe);
    }

    getAll() {
        return this.http.get<Recipe[]>(`${environment.apiUrl}/recipes`);
    }

    getById(id: string) {
        return this.http.get<Recipe>(`${environment.apiUrl}/recipes/${id}`);
    }

    update(id: string, params: any) {
        return this.http.put(`${environment.apiUrl}/recipes/${id}`, params)
            .pipe(map(x => {
                if (id == this.recipeValue?.id) {
                    // update local storage
                    const recipe = { ...this.recipeValue, ...params };
                    localStorage.setItem('recipe', JSON.stringify(recipe));

                    // publish updated recipe to subscribers
                    this.recipeSubject.next(recipe);
                }
                return x;
            }));
    }

    delete(id: string) {
        return this.http.delete(`${environment.apiUrl}/recipes/${id}`)
            .pipe(map(x => {
                return x;
            }));
    }

    search(recipe: RecipeSearch) {
        return this.http.post(`${environment.apiUrl}/recipes/search/${recipe.pageIndex}/${recipe.pageSize}`, {
            title: recipe.title,
            time: recipe.time,
            ingredients: recipe.ingredients,
            date: recipe.date
        });
    }
}