import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3, { message: 'Ingresá un correo o nombre de usuario válido.' })
  @MaxLength(254)
  identificador!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  @Matches(/^(?=.*\p{Lu})(?=.*\d).{8,72}$/u, {
    message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.',
  })
  password!: string;
}
