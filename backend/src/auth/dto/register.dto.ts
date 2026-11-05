import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellido!: string;

  @IsEmail()
  @MaxLength(254)
  correo!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  nombreUsuario!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*\p{Lu})(?=.*\d).{8,72}$/u, {
    message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.',
  })
  password!: string;

  @IsString()
  @MaxLength(72)
  repetirPassword!: string;

  @IsDateString()
  fechaNacimiento!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  descripcion?: string;
}
