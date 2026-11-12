import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Exige login. Enquanto o primeiro acesso estiver pendente (usuário padrão com a senha inicial ou sem
 * perguntas de segurança), só a tela de perfil fica liberada.
 */
export const authGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  if (auth.setupRequired() && route.routeConfig?.path !== 'perfil') return router.createUrlTree(['/perfil']);
  return true;
};

export const guestGuard: CanActivateFn = () =>
  inject(AuthService).isLoggedIn() ? inject(Router).createUrlTree(['/']) : true;
