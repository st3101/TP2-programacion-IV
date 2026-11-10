import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListPublicacionesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero.' })
  @Min(0, { message: 'El offset mínimo es 0.' })
  offset = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite mínimo es 1.' })
  @Max(20, { message: 'El límite máximo es 20 publicaciones.' })
  limit = 5;

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
