import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface RequisitosPassword {
  largo: boolean;
  mayuscula: boolean;
  numero: boolean;
}

export function requisitosPassword(valor: string): RequisitosPassword {
  return {
    largo: valor.length >= 8,
    mayuscula: /[A-Z]/.test(valor),
    numero: /\d/.test(valor),
  };
}

/** Al menos 8 caracteres, una mayúscula y un número. */
export const passwordFuerte: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as string;
  if (!valor) return null; // el "required" se valida aparte
  const r = requisitosPassword(valor);
  return r.largo && r.mayuscula && r.numero ? null : { passwordDebil: r };
};

/** Validador de grupo: password y repetirPassword deben coincidir. */
export const passwordsIguales: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const password = grupo.get('password')?.value;
  const repetir = grupo.get('repetirPassword')?.value;
  return password && repetir && password !== repetir ? { noCoinciden: true } : null;
};

/** Fecha 'yyyy-MM-dd' no futura y posterior a 1900. */
export const fechaNacimientoValida: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as string;
  if (!valor) return null;
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (valor > hoy) return { fechaFutura: true };
  if (valor < '1900-01-01') return { fechaInvalida: true };
  return null;
};

/** El texto no puede ser solo espacios (un campo vacío lo resuelve `Validators.required`). */
export const textoNoVacio: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as string;
  return valor && valor.trim() === '' ? { vacio: true } : null;
};
