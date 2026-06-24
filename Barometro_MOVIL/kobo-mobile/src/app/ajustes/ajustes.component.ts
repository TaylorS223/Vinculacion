import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../auth.service';
import { StorageService } from '../storage.service';

@Component({
  selector: 'app-ajustes',
  imports: [RouterLink],
  templateUrl: './ajustes.component.html',
  styleUrls: ['./ajustes.component.css']
})
export class AjustesComponent {
  constructor(
    private location: Location,
    private auth: AuthService,
    private storage: StorageService
  ) {}

  regresarAtras() {
    this.location.back();
  }

  cambiarServidor() {
    const nuevoServidor = prompt('Ingresa la nueva URL del servidor:', this.auth.obtenerUrlServidor() || '');
    if (nuevoServidor && nuevoServidor.trim().length > 0) {
      // Guardar el nuevo servidor en localStorage
      localStorage.setItem('kobo_server_url', nuevoServidor);
      alert('Servidor actualizado correctamente.');
    }
  }

  cambiarIdioma() {
    alert('Idioma — próximamente disponible. Por ahora solo español.');
  }

  limpiarDatos() {
    if (confirm('¿Estás seguro? Se eliminarán todos los formularios guardados localmente.')) {
      this.storage.limpiarFormularios();
      alert('Datos locales eliminados.');
    }
  }

  verAcercaDe() {
    alert('ULEAM v1.0.0\nAplicación móvil para recolección de datos\nProyecto Integrador');
  }
}
