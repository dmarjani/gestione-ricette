import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, materialize, dematerialize } from 'rxjs/operators';

// array in local storage for registered users
const usersKey = 'registration-login-users';
let users: any[] = JSON.parse(localStorage.getItem(usersKey)!) || [];
// array in local storage for saved recipes
const recipesKey = 'CRUD-recipes';
let recipes: any[] = JSON.parse(localStorage.getItem(recipesKey)!) || [];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;

        return handleRoute();

        function handleRoute() {
            switch (true) {
                case url.endsWith('/users/authenticate') && method === 'POST':
                    return authenticate();
                case url.endsWith('/users/register') && method === 'POST':
                    return register();
                case url.endsWith('/users') && method === 'GET':
                    return getUsers();
                case url.match(/\/users\/\d+$/) && method === 'GET':
                    return getUserById();
                case url.match(/\/users\/\d+$/) && method === 'PUT':
                    return updateUser();
                case url.match(/\/users\/\d+$/) && method === 'DELETE':
                    return deleteUser();
                case url.endsWith('/recipes/create') && method === 'POST':
                    return createRecipe();
                case url.match(/\/recipes\/search\/\d+\/\d+$/) && method === 'POST':
                    return searchRecipe();
                case url.endsWith('/recipes') && method === 'GET':
                    return getRecipes();
                case url.match(/\/recipes\/\d+$/) && method === 'GET':
                    return getRecipeById();
                case url.match(/\/recipes\/\d+$/) && method === 'PUT':
                    return updateRecipe();
                case url.match(/\/recipes\/\d+$/) && method === 'DELETE':
                    return deleteRecipe();
                default:
                    // pass through any requests not handled above
                    return next.handle(request);
            }    
        }

        // route functions

        function authenticate() {
            const { username, password } = body;
            const user = users.find(x => x.username === username && x.password === password);
            if (!user) return error('Username or password is incorrect');
            return ok({
                ...basicDetails(user),
                token: 'fake-jwt-token'
            })
        }

        function register() {
            const user = body

            if (users.find(x => x.username === user.username)) {
                return error('Username "' + user.username + '" is already taken')
            }

            user.id = users.length ? Math.max(...users.map(x => x.id)) + 1 : 1;
            users.push(user);
            localStorage.setItem(usersKey, JSON.stringify(users));
            return ok();
        }

        function getUsers() {
            if (!isLoggedIn()) return unauthorized();
            return ok(users.map(x => basicDetails(x)));
        }

        function getUserById() {
            if (!isLoggedIn()) return unauthorized();

            const user = users.find(x => x.id === idFromUrl());
            return ok(basicDetails(user));
        }

        function updateUser() {
            if (!isLoggedIn()) return unauthorized();

            let params = body;
            let user = users.find(x => x.id === idFromUrl());

            // only update password if entered
            if (!params.password) {
                delete params.password;
            }

            // update and save user
            Object.assign(user, params);
            localStorage.setItem(usersKey, JSON.stringify(users));

            return ok();
        }

        function deleteUser() {
            if (!isLoggedIn()) return unauthorized();

            users = users.filter(x => x.id !== idFromUrl());
            localStorage.setItem(usersKey, JSON.stringify(users));
            return ok();
        }

        function createRecipe() {
            if (!isLoggedIn()) return unauthorized();
            const recipe = body

            if (recipes.find(x => x.title === recipe.title)) {
                return error('Title "' + recipe.title + '" is already taken')
            }

            recipe.id = recipes.length ? Math.max(...recipes.map(x => x.id)) + 1 : 1;
            recipes.push(recipe);
            localStorage.setItem(recipesKey, JSON.stringify(recipes));
            return ok();
        }

        function searchRecipe() {
            if (!isLoggedIn()) return unauthorized();
            let param = body;           
            let subRecipes: any[] = filter(param);
            let totalElements = subRecipes.length;
            let pageSize = pageSizeFromUrl();
            let pageIndex = pageIndexFromUrl(); 
            subRecipes.sort( (a, b) => a.title > b.title ? 1: -1 );
            let values = subRecipes.slice(
                pageIndex * pageSize, 
                pageIndex * pageSize + pageSize > totalElements ? totalElements : pageIndex * pageSize + pageSize);
            return ok({ pageIndex, pageSize, totalElements, values });
        }

        function getRecipes() {
            if (!isLoggedIn()) return unauthorized();
            return ok(recipes.map(x => basicDetailsRecipe(x)));
        }

        function getRecipeById() {
            if (!isLoggedIn()) return unauthorized();

            const recipe = recipes.find(x => x.id === idFromUrl());
            return ok(basicDetailsRecipe(recipe));
        }

        function updateRecipe() {
            if (!isLoggedIn()) return unauthorized();

            let params = body;
            let recipe = recipes.find(x => x.id === idFromUrl());

            // update and save recipe
            Object.assign(recipe, params);
            localStorage.setItem(recipesKey, JSON.stringify(recipes));

            return ok();
        }

        function deleteRecipe() {
            if (!isLoggedIn()) return unauthorized();

            recipes = recipes.filter(x => x.id !== idFromUrl());
            localStorage.setItem(recipesKey, JSON.stringify(recipes));
            return ok();
        }

        // helper functions

        function ok(body?: any) {
            return of(new HttpResponse({ status: 200, body }))
                .pipe(delay(500)); // delay observable to simulate server api call
        }

        function error(message: string) {
            return throwError(() => ({ error: { message } }))
                .pipe(materialize(), delay(500), dematerialize()); // call materialize and dematerialize to ensure delay even if an error is thrown (https://github.com/Reactive-Extensions/RxJS/issues/648);
        }

        function unauthorized() {
            return throwError(() => ({ status: 401, error: { message: 'Unauthorized' } }))
                .pipe(materialize(), delay(500), dematerialize());
        }

        function basicDetails(user: any) {
            const { id, username, firstName, lastName } = user;
            return { id, username, firstName, lastName };
        }

        function isLoggedIn() {
            return headers.get('Authorization') === 'Bearer fake-jwt-token';
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function pageSizeFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function pageIndexFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 2]);
        }

        function basicDetailsRecipe(recipe: any) {
            const { id, title, description, ingredients, time, date } = recipe;
            return { id, title, description, ingredients, time, date };
        }

        function filter(param: any) {
            if( param.title && param.time && param.ingredients && param.date )
                return recipes.filter( x => param.title === x.title &&
                                                param.time === x.time && 
                                                param.ingredients === x.ingredients &&
                                                param.date === x.date);
            if( !param.title && param.time && param.ingredients && param.date )
                return recipes.filter( x => param.time === x.time &&                         
                                                param.ingredients === x.ingredients &&
                                                param.date === x.date);
            if( param.title && !param.time && param.ingredients && param.date )
                return recipes.filter( x => param.title === x.title &&                         
                                                param.ingredients === x.ingredients &&
                                                param.date === x.date);
            if( param.title && param.time && !param.ingredients && param.date )
                return recipes.filter( x => param.time === x.time &&                         
                                                param.title === x.title &&
                                                param.date === x.date);
            if( param.title && param.time && param.ingredients && !param.date )
                return recipes.filter( x => param.time === x.time &&                         
                                                param.ingredients === x.ingredients &&
                                                param.title === x.title);
            if( !param.title && !param.time && param.ingredients && param.date )
                return recipes.filter( x => param.ingredients === x.ingredients &&
                                                param.date === x.date);
            if( !param.title && param.time && !param.ingredients && param.date )
                return recipes.filter( x => param.time === x.time &&
                                                param.date === x.date);
            if( !param.title && param.time && param.ingredients && !param.date )
                return recipes.filter( x => param.ingredients === x.ingredients &&
                                                param.time === x.time);
            if( param.title && !param.time && !param.ingredients && param.date )
                return recipes.filter( x => param.title === x.title &&
                                                param.date === x.date);
            if( param.title && !param.time && param.ingredients && !param.date )
                return recipes.filter( x => param.ingredients === x.ingredients &&
                                                param.title === x.title);
            if( param.title && param.time && !param.ingredients && !param.date )
                return recipes.filter( x => param.title === x.title &&
                                                param.time === x.time);
            if( !param.title && !param.time && !param.ingredients && param.date )
                return recipes.filter( x => param.date === x.date );
            if( !param.title && !param.time && param.ingredients && !param.date )
                return recipes.filter( x => param.ingredients === x.ingredients );
            if( !param.title && param.time && !param.ingredients && !param.date )
                return recipes.filter( x => param.time === x.time );
            if( param.title && !param.time && !param.ingredients && !param.date )
                return recipes.filter( x => param.title === x.title ); 
            return recipes;                        
        }

    }
}

export const fakeBackendProvider = {
    // use fake backend in place of Http service for backend-less development
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};