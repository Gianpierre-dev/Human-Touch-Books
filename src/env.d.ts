/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    sesion?: {
      usuarioId: string;
      correo: string;
    };
  }
}
