import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'kobo_token';
const USER_KEY = 'kobo_user';
const SERVER_KEY = 'kobo_server_url';
const DEMO_KEY = 'kobo_demo_mode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Señal reactiva para saber en cualquier parte de la app si hay sesión activa
  isAuthenticated = signal<boolean>(this.hayTokenGuardado());

  private hayTokenGuardado(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Simula una llamada a un backend de autenticación tipo KoboToolbox.
   * Cuando tengas tu API real, reemplaza el contenido de esta función
   * por un this.http.post(`${urlServidor}/login`, { usuario, clave })
   * y guarda el token que te devuelva el servidor.
   */
  login(urlServidor: string, usuario: string, clave: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const credencialesValidas =
          urlServidor.trim().length > 0 &&
          usuario.trim().length > 0 &&
          clave.trim().length > 0;

        if (credencialesValidas) {
          const tokenFalso = 'fake-jwt-' + Date.now();
          localStorage.setItem(TOKEN_KEY, tokenFalso);
          localStorage.setItem(USER_KEY, usuario);
          localStorage.setItem(SERVER_KEY, urlServidor);
          localStorage.removeItem(DEMO_KEY);
          this.isAuthenticated.set(true);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 800); // Simula latencia de red
    });
  }

  /**
   * Entra en modo demo: no valida nada contra un servidor,
   * solo habilita la sesión con datos de prueba.
   */
  entrarModoDemo(): void {
    const tokenDemo = 'demo-token-' + Date.now();
    localStorage.setItem(TOKEN_KEY, tokenDemo);
    localStorage.setItem(USER_KEY, 'demo');
    localStorage.setItem(SERVER_KEY, 'modo-demo');
    localStorage.setItem(DEMO_KEY, 'true');
    this.isAuthenticated.set(true);
  }

  esModoDemo(): boolean {
    return localStorage.getItem(DEMO_KEY) === 'true';
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SERVER_KEY);
    localStorage.removeItem(DEMO_KEY);
    this.isAuthenticated.set(false);
  }

  obtenerUsuario(): string | null {
    return localStorage.getItem(USER_KEY);
  }

  obtenerUrlServidor(): string | null {
    return localStorage.getItem(SERVER_KEY);
  }
}
