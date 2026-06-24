import { Component, OnInit } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; // <-- Importamos ActivatedRoute
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StorageService } from '../storage.service';

@Component({
  selector: 'app-llenar-encuesta',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './llenar-encuesta.component.html',
  styleUrls: ['./llenar-encuesta.component.css']
})
export class LlenarEncuestaComponent implements OnInit {
  // Aquí guardaremos el ID de la encuesta seleccionada (1 o 2)
  encuestaId: string | null = null;
  tiempoInicio: Date = new Date();
  tiempoInicioFormato: string = '';
  duracionSegundos: number = 0;
  duracionTexto: string = '00:00';
  timerInterval: any = null;

  // Estructura para guardar las respuestas de la Encuesta 1 (Comunitaria)
  respuestasComunidad = {
    nombreEncuestado: '',
    edad: null,
    sector: '',
    observaciones: ''
  };

  // NUEVA: Estructura para las respuestas de la Encuesta 2 (Agrícola)
  respuestasAgricola = {
    nombreProductor: '',
    tipoCultivo: '',
    hectareas: null,
    usaRiego: ''
  };

  constructor(
    private router: Router, 
    private route: ActivatedRoute, // Inyectamos para leer la URL
    private storage: StorageService
  ) {}

  ngOnInit() {
    // Capturamos el parámetro 'id' que configuramos en las rutas (/llenar/:id)
    this.encuestaId = this.route.snapshot.paramMap.get('id');
    
    // Guardamos la hora de inicio
    this.tiempoInicio = new Date();
    const horas = String(this.tiempoInicio.getHours()).padStart(2, '0');
    const minutos = String(this.tiempoInicio.getMinutes()).padStart(2, '0');
    const dia = String(this.tiempoInicio.getDate()).padStart(2, '0');
    const mes = String(this.tiempoInicio.getMonth() + 1).padStart(2, '0');
    const año = this.tiempoInicio.getFullYear();
    this.tiempoInicioFormato = `${horas}:${minutos} - ${dia}/${mes}/${año}`;

    this.timerInterval = setInterval(() => {
      this.duracionSegundos += 1;
      this.duracionTexto = this.formatTime(this.duracionSegundos);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(segundos: number) {
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`;
  }

  guardarFormulario() {
    const formularioGuardado = {
      id: Date.now(),
      encuestaId: this.encuestaId,
      tipo: this.encuestaId === '1' ? 'Diagnóstico Comunitario' : 'Censo Agrícola',
      fechaInicio: this.tiempoInicioFormato,
      duracionSegundos: this.duracionSegundos,
      duracionTexto: this.duracionTexto,
      respuestas: this.encuestaId === '1' ? { ...this.respuestasComunidad } : { ...this.respuestasAgricola },
      estado: 'listo-para-enviar'
    };

    this.storage.agregarFormulario(formularioGuardado);
    alert('¡Formulario guardado con éxito en la memoria local!');
    this.router.navigate(['/']);
  }
}