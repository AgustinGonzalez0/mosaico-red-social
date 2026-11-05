import { EstadoUsuarioPipe } from './estado-usuario.pipe';
import { NombreCompletoPipe } from './nombre-completo.pipe';
import { ResumenTextoPipe } from './resumen-texto.pipe';

describe('Pipes de administración', () => {
  it('forma el nombre completo y tolera nulos', () => { const pipe = new NombreCompletoPipe(); expect(pipe.transform({ nombre: 'Ana', apellido: 'Pérez' } as any)).toBe('Ana Pérez'); expect(pipe.transform(null)).toBe('Sin nombre'); });
  it('traduce el estado de usuario', () => { const pipe = new EstadoUsuarioPipe(); expect(pipe.transform(true)).toBe('Habilitado'); expect(pipe.transform(false)).toBe('Deshabilitado'); });
  it('resume sin cortar una palabra cuando es posible', () => { expect(new ResumenTextoPipe().transform('Este es un texto largo para mostrar', 16)).toBe('Este es un...'); });
});
