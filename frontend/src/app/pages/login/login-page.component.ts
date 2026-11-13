import { Component } from '@angular/core';
import { AuthPageFormComponent } from '../../shared/auth-page-form/auth-page-form.component';

@Component({
  selector: 'app-login-page',
  imports: [AuthPageFormComponent],
  template: '<app-auth-page-form mode="login" />',
})
export class LoginPageComponent {}
