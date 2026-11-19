import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'El estado debe ser habilitado o deshabilitado.' })
  habilitado!: boolean;
}
