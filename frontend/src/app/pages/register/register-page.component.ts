import { Component } from '@angular/core';
import { AuthPageFormComponent } from '../../shared/auth-page-form/auth-page-form.component';

@Component({
  selector: 'app-register-page',
  imports: [AuthPageFormComponent],
  template: '<app-auth-page-form mode="register" />',
})
export class RegisterPageComponent {}
