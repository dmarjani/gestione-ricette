import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs';
import { AlertService } from 'src/app/services';
import { RecipeService } from 'src/app/services/recipe.service';

@Component({
  selector: 'app-add-edit',
  templateUrl: './add-edit.component.html',
  styleUrls: ['./add-edit.component.css']
})
export class AddEditComponent {
  form!: FormGroup;
  id?: string;
  title!: string;
  loading = false;
  submitting = false;
  submitted = false;

  constructor(
      private formBuilder: FormBuilder,
      private route: ActivatedRoute,
      private router: Router,
      private recipeService: RecipeService,
      private alertService: AlertService
  ) { }

  ngOnInit() {
      this.id = this.route.snapshot.params['id'];

      // form with validation rules
      this.form = this.formBuilder.group({
          title: ['', Validators.required],
          ingredients: ['', Validators.required],
          time: ['', Validators.required],
          date: ['', Validators.required],
          description: ['', Validators.required]
      });

      this.title = 'Add Recipe';
      if (this.id) {
          // edit mode
          this.title = 'Edit Recipe';
          this.loading = true;
          this.recipeService.getById(this.id)
              .pipe(first())
              .subscribe(x => {
                  this.form.patchValue(x);
                  this.loading = false;
              });
      }
  }

  // convenience getter for easy access to form fields
  get f() { return this.form.controls; }

  onSubmit() {
      this.submitted = true;

      // reset alerts on submit
      this.alertService.clear();

      // stop here if form is invalid
      if (this.form.invalid) {
          return;
      }

      this.submitting = true;
      this.saveRecipe()
          .pipe(first())
          .subscribe({
              next: () => {
                  this.alertService.success('Recipe saved', { keepAfterRouteChange: true });
                  this.router.navigateByUrl('/recipes');
              },
              error: error => {
                  this.alertService.error(error);
                  this.submitting = false;
              }
          })
  }

  private saveRecipe() {
      // create or update recipe based on id param
      return this.id
          ? this.recipeService.update(this.id!, this.form.value)
          : this.recipeService.create(this.form.value);
  }
}
