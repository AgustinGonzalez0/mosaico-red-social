/** Al menos 8 caracteres, una mayúscula y un número. */
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número';
