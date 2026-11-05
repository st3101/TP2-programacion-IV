import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePublicacionDto {
  @IsString({ message: 'El título debe ser un texto.' })
  @MinLength(1, { message: 'El título es obligatorio.' })
  @MaxLength(120, { message: 'El título no puede superar los 120 caracteres.' })
  titulo!: string;

  @IsString({ message: 'La descripción debe ser un texto.' })
  @MinLength(1, { message: 'La descripción es obligatoria.' })
  @MaxLength(10000, { message: 'La descripción no puede superar los 10000 caracteres.' })
  descripcion!: string;

  @IsOptional()
  @IsString({ message: 'La URL de imagen debe ser un texto.' })
  @MaxLength(2048, { message: 'La URL de imagen es demasiado larga.' })
  imagenUrl?: string;
}
