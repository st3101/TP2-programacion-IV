import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  nombreUsuario?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  descripcion?: string;

}
