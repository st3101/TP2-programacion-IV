import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appResaltarAlPasar]',
  standalone: true,
})
export class ResaltarAlPasarDirective {
  @HostBinding('style.transition') transicion = 'box-shadow 180ms ease';
  @HostBinding('style.box-shadow') sombra = '';

  @HostListener('mouseenter')
  resaltar(): void {
    this.sombra = '0 2px 8px rgb(217 149 137 / 16%)';
  }

  @HostListener('mouseleave')
  quitarResaltado(): void {
    this.sombra = '';
  }
}
