import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[appLimpiarEspacios]',
  standalone: true,
})
export class LimpiarEspaciosDirective {
  private readonly campo = inject(ElementRef<HTMLInputElement>);

  @HostListener('blur')
  limpiarEspacios(): void {
    const texto = this.campo.nativeElement.value;
    const textoSinEspaciosAfuera = texto.trim();

    if (texto === textoSinEspaciosAfuera) {
      return;
    }

    this.campo.nativeElement.value = textoSinEspaciosAfuera;
    this.campo.nativeElement.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
