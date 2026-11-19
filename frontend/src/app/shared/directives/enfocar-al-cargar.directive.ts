import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appEnfocarAlCargar]',
  standalone: true,
})
export class EnfocarAlCargarDirective implements AfterViewInit {
  private readonly campo = inject(ElementRef<HTMLInputElement>);

  ngAfterViewInit(): void {
    this.campo.nativeElement.focus();
  }
}
