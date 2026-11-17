import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListPublicacionesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página mínima es 1.' })
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad mínima es 1 publicación.' })
  @Max(20, { message: 'La cantidad máxima es 20 publicaciones.' })
  cantidad = 5;

  @IsOptional()
  @IsIn(['fecha', 'me-gusta'], { message: 'El orden debe ser fecha o me-gusta.' })
  orden: 'fecha' | 'me-gusta' = 'fecha';

  @IsOptional()
  @IsMongoId({ message: 'El ID del usuario no es válido.' })
  usuarioId?: string;

  @IsOptional()
  @IsString({ message: 'El usuario debe ser texto.' })
  @MaxLength(50, { message: 'El nombre de usuario es demasiado largo.' })
  usuario?: string;
}
