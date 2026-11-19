import { IsEnum } from 'class-validator';
import { PerfilUsuario } from '../../database/schemas/usuario.schema';
import { RegisterDto } from '../../auth/dto/register.dto';

export class AdminCreateUserDto extends RegisterDto {
  @IsEnum(PerfilUsuario, { message: 'Elegí un perfil válido: usuario o administrador.' })
  perfil!: PerfilUsuario;
}
