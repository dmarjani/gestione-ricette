import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { first } from 'rxjs';
import { Recipe } from 'src/app/models/recipe';
import { RecipeService } from 'src/app/services/recipe.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { RecipeResponse } from 'src/app/models/recipe-response';
import { RecipeSearch } from 'src/app/models/reciepe-search';
import { AlertService } from 'src/app/services';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit {

  form!: FormGroup;
  submitting = false;
  recipeSearch: RecipeSearch = {
    pageIndex: 0,
    pageSize: 10,
  };
  recipeResponse?: RecipeResponse;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private recipeService: RecipeService,
              private formBuilder: FormBuilder, 
              private alertService: AlertService){}

  displayedColumns: string[] = ['id', 'title', 'ingredients', 'date', 'time', 'buttons'];
  dataSource = new MatTableDataSource<Recipe>;

  ngOnInit() {
    // search form without validation
    this.form = this.formBuilder.group({
      title: ['', null],
      ingredients: ['', null],
      time: ['', null],
      date: ['', null]
    });
    this.search();
  }

  deleteRecipe(id: string) {
      const recepe = this.recipeResponse!.values!.find(x => x.id === id);
      recepe.isDeleting = true;
      this.recipeService.delete(id)
          .pipe(first())
          .subscribe({
            next: () => {
              this.alertService.success('Recipe ' + id + ' deleted', { keepAfterRouteChange: true });
              this.search();
            },
            error: error => {
              this.alertService.error(error);
            }
          });
  }

  search() {
    this.recipeService.search(this.recipeSearch)
        .pipe(first())
        .subscribe({
          next: recipeResponse => {
            this.recipeResponse = recipeResponse
            this.dataSource = new MatTableDataSource(this.recipeResponse.values);
            if(this.submitting) this.submitting = false;
          },
          error: error => {
            this.alertService.error(error);
            if(this.submitting) this.submitting = false;
          } 
        });
  }

  onChangePage(event: any) {
    this.recipeSearch.pageIndex = event.pageIndex,
    this.recipeSearch.pageSize = event.pageSize
    this.search();
  }

  onSubmit() {
    this.submitting = true;
    this.reset();
    this.recipeSearch.pageIndex = 0;
    this.initParams();
    this.search();
  }

  initParams() {
    if(this.form.value.title) this.recipeSearch.title = this.form.value.title
    if(this.form.value.ingredients) this.recipeSearch.ingredients = this.form.value.ingredients
    if(this.form.value.date) this.recipeSearch.date = this.form.value.date
    if(this.form.value.time) this.recipeSearch.time = this.form.value.time
  }

  reset() {
    this.recipeSearch = {
      pageIndex: this.recipeSearch.pageIndex,
      pageSize: this.recipeSearch.pageSize
    }
  }

}
