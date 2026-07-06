import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  urlServidor: string = '';
  usuario: string = '';
  clave: string = '';

  cargando: boolean = false;
  errorLogin: string = '';

  urlPlataformaWeb = 'https://barometro-web.example.com';

  async iniciarSesion() {
    this.errorLogin = '';

    if (!this.urlServidor.trim() || !this.usuario.trim() || !this.clave.trim()) {
      this.errorLogin = 'Completa la URL del servidor, usuario y contraseña.';
      return;
    }

    this.cargando = true;
    try {
      const response = await this.api.login(this.urlServidor, this.usuario, this.clave);
      this.auth.guardarSesion(
        response.token,
        response.user.name,
        response.user.email,
        this.urlServidor
      );
      this.cargando = false;
      this.router.navigate(['/']);
    } catch {
      this.cargando = false;
      this.errorLogin = 'No se pudo iniciar sesión. Verifica tus datos y la URL del servidor.';
    }
  }

  entrarModoDemo() {
    this.auth.entrarModoDemo();
    this.router.navigate(['/']);
  }

  irAPlataformaWeb() {
    alert('La plataforma web (Barometro_WEB) todavía no está disponible. Próximamente podrás crear tu cuenta desde ahí.');
  }
}
