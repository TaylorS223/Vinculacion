import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

// TODO: cuando Barometro_WEB esté publicado, reemplazar esta URL por la real.
const URL_PLATAFORMA_WEB = 'https://barometro-web.example.com';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  urlServidor: string = '';
  usuario: string = '';
  clave: string = '';

  cargando: boolean = false;
  errorLogin: string = '';

  urlPlataformaWeb = URL_PLATAFORMA_WEB;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async iniciarSesion() {
    this.errorLogin = '';

    if (!this.urlServidor.trim() || !this.usuario.trim() || !this.clave.trim()) {
      this.errorLogin = 'Completa la URL del servidor, usuario y contraseña.';
      return;
    }

    this.cargando = true;
    const exito = await this.auth.login(this.urlServidor, this.usuario, this.clave);
    this.cargando = false;

    if (exito) {
      this.router.navigate(['/']);
    } else {
      this.errorLogin = 'No se pudo iniciar sesión. Verifica tus datos.';
    }
  }

  entrarModoDemo() {
    this.auth.entrarModoDemo();
    this.router.navigate(['/']);
  }

  irAPlataformaWeb() {
    // Por ahora Barometro_WEB no está implementado todavía.
    // Cuando exista, esto abrirá la URL real en una nueva pestaña.
    alert('La plataforma web (Barometro_WEB) todavía no está disponible. Próximamente podrás crear tu cuenta desde ahí.');
  }
}
