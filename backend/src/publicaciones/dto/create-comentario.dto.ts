import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateComentarioDto {
  @IsString({ message: 'El comentario debe ser un texto.' })
  @MinLength(1, { message: 'El comentario no puede estar vacío.' })
  @Matches(/\S/, { message: 'El comentario no puede estar vacío.' })
  @MaxLength(3000, { message: 'El comentario no puede superar los 3000 caracteres.' })
  mensaje!: string;
}
