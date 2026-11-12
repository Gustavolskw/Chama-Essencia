import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { BalanceComponent } from './pages/balance.component';
import { EstimateComponent } from './pages/estimate.component';
import { HelpComponent } from './pages/help.component';
import { LoginComponent } from './pages/login.component';
import { BatchEditorComponent } from './pages/production/batch-editor.component';
import { ProductionComponent } from './pages/production/production.component';
import { ProfileComponent } from './pages/profile.component';
import { RecoverComponent } from './pages/recover.component';
import { RegisterComponent } from './pages/register.component';
import { SalesComponent } from './pages/sales.component';
import { SettingsComponent } from './pages/settings.component';
import { StockComponent } from './pages/stock.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'cadastro', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'recuperar-senha', component: RecoverComponent, canActivate: [guestGuard] },
  { path: 'producao', component: ProductionComponent, canActivate: [authGuard] },
  { path: 'producao/novo', component: BatchEditorComponent, canActivate: [authGuard] },
  { path: 'producao/:id', component: BatchEditorComponent, canActivate: [authGuard] },
  { path: 'estoque', component: StockComponent, canActivate: [authGuard] },
  { path: 'vendas', component: SalesComponent, canActivate: [authGuard] },
  { path: 'balanco', component: BalanceComponent, canActivate: [authGuard] },
  { path: 'estimativa', component: EstimateComponent, canActivate: [authGuard] },
  { path: 'configuracoes', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'perfil', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'ajuda', component: HelpComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'producao' },
  { path: '**', redirectTo: 'producao' },
];
