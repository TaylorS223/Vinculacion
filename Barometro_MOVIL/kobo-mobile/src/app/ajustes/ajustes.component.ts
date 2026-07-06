import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { AuthService } from '../auth.service';
import { StorageService } from '../storage.service';
import { ThemeService } from '../theme.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-ajustes',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './ajustes.component.html',
  styleUrls: ['./ajustes.component.css']
})
export class AjustesComponent {
  private location = inject(Location);
  private auth = inject(AuthService);
  private storage = inject(StorageService);
  theme = inject(ThemeService);

  regresarAtras() {
    this.location.back();
  }

  cambiarServidor() {
    const nuevoServidor = prompt(
      this.theme.t('change_server') + ':',
      this.auth.obtenerUrlServidor() || ''
    );
    if (nuevoServidor && nuevoServidor.trim().length > 0) {
      localStorage.setItem('kobo_server_url', nuevoServidor);
      alert(this.theme.t('server_url') + ' actualizado.');
    }
  }

  async limpiarDatos() {
    if (confirm(this.theme.t('delete_confirm'))) {
      await this.storage.limpiarFormularios();
      alert('Datos locales eliminados.');
    }
  }

  verAcercaDe() {
    alert('ULEAM ' + this.theme.t('version'));
  }
}
