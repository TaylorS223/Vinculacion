<?php

namespace App\Presentation\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormQuestion;
use App\Models\FormResponse;
use App\Models\FormUserShare;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Facades\Excel;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Forms', description: 'Formularios dinamicos, publicacion, respuestas y comparticion')]
class FormController extends Controller
{
    #[OA\Get(path: '/forms', summary: 'Listar formularios propios y compartidos', security: [['sanctum' => []]], tags: ['Forms'])]
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return response()->json([
                'my_forms' => Form::with('owner:id,name,email,rol')->withCount('responses')->latest()->get(),
                'shared_forms' => [],
            ]);
        }

        $myForms = Form::where('user_id', $user->id)->withCount('responses')->latest()->get();
        $sharedForms = Form::whereHas('shares', fn($q) => $q->where('user_id', $user->id))
            ->withCount('responses')
            ->latest()
            ->get();

        return response()->json([
            'my_forms' => $myForms,
            'shared_forms' => $sharedForms,
        ]);
    }

    #[OA\Post(path: '/forms', summary: 'Crear formulario en borrador', security: [['sanctum' => []]], tags: ['Forms'])]
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $form = Form::create([
            'title' => $request->title,
            'description' => $request->description,
            'user_id' => $request->user()->id,
            'state' => 'DRAFT',
        ]);

        return response()->json($form, 201);
    }

    #[OA\Get(path: '/forms/{id}', summary: 'Ver detalle de formulario', security: [['sanctum' => []]], tags: ['Forms'])]
    public function show(Request $request, string $id): JsonResponse
    {
        $form = $this->findViewableForm($id, $request->user());
        $form->load(['questions' => fn($q) => $q->orderBy('order'), 'shares.user:id,name,email,rol']);

        return response()->json($form);
    }

    #[OA\Put(path: '/forms/{id}', summary: 'Actualizar formulario no implementado', security: [['sanctum' => []]], tags: ['Forms'])]
    public function update(Request $request, string $id): JsonResponse
    {
        $form = $this->findEditableForm($id, $request->user());

        if ($form->state === 'DEPLOYED') {
            return response()->json(['message' => 'No se puede editar un formulario implementado'], 403);
        }

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $form->update($request->only(['title', 'description']));

        return response()->json($form);
    }

    #[OA\Delete(path: '/forms/{id}', summary: 'Eliminar formulario propio o cualquier formulario como super admin', security: [['sanctum' => []]], tags: ['Forms'])]
    public function destroy(Request $request, string $id): JsonResponse
    {
        $form = Form::findOrFail($id);
        $user = $request->user();

        if (!$user->isSuperAdmin() && (int) $form->user_id !== (int) $user->id) {
            return response()->json(['message' => 'No tienes permisos para eliminar este formulario'], 403);
        }

        $form->delete();

        return response()->json(null, 204);
    }

    #[OA\Post(path: '/forms/{id}/deploy', summary: 'Implementar formulario y generar enlace publico', security: [['sanctum' => []]], tags: ['Forms'])]
    public function deploy(Request $request, string $id): JsonResponse
    {
        $form = $this->findEditableForm($id, $request->user());
        $form->update([
            'state' => 'DEPLOYED',
            'link_uuid' => $form->link_uuid ?? Str::uuid(),
        ]);

        return response()->json($form);
    }

    #[OA\Post(path: '/forms/{id}/archive', summary: 'Archivar formulario', security: [['sanctum' => []]], tags: ['Forms'])]
    public function archive(Request $request, string $id): JsonResponse
    {
        $form = $this->findEditableForm($id, $request->user());
        $form->update(['state' => 'ARCHIVED']);

        return response()->json($form);
    }

    #[OA\Get(path: '/forms/{id}/questions', summary: 'Listar preguntas', security: [['sanctum' => []]], tags: ['Forms'])]
    public function getQuestions(Request $request, string $id): JsonResponse
    {
        $form = $this->findViewableForm($id, $request->user());

        return response()->json($form->questions()->orderBy('order')->get());
    }

    #[OA\Post(path: '/forms/{id}/questions', summary: 'Agregar pregunta', security: [['sanctum' => []]], tags: ['Forms'])]
    public function storeQuestion(Request $request, string $id): JsonResponse
    {
        $form = $this->findEditableForm($id, $request->user());

        if ($form->state === 'DEPLOYED') {
            return response()->json(['message' => 'No se puede cambiar preguntas de un formulario implementado'], 403);
        }

        $request->validate([
            'type' => 'required|in:MULTIPLE_CHOICE,SINGLE_CHOICE,LIKERT,TEXT,NUMBER',
            'label' => 'required|string',
            'order' => 'integer',
            'required' => 'boolean',
            'options' => 'nullable|array',
        ]);

        $question = $form->questions()->create($request->all());

        return response()->json($question, 201);
    }

    #[OA\Put(path: '/forms/questions/{question_id}', summary: 'Actualizar pregunta', security: [['sanctum' => []]], tags: ['Forms'])]
    public function updateQuestion(Request $request, string $question_id): JsonResponse
    {
        $question = FormQuestion::with('form')->findOrFail($question_id);
        $this->abortUnlessCanEdit($question->form, $request->user());

        if ($question->form->state === 'DEPLOYED') {
            return response()->json(['message' => 'No se puede cambiar preguntas de un formulario implementado'], 403);
        }

        $question->update($request->all());

        return response()->json($question);
    }

    #[OA\Delete(path: '/forms/questions/{question_id}', summary: 'Eliminar pregunta', security: [['sanctum' => []]], tags: ['Forms'])]
    public function destroyQuestion(Request $request, string $question_id): JsonResponse
    {
        $question = FormQuestion::with('form')->findOrFail($question_id);
        $this->abortUnlessCanEdit($question->form, $request->user());

        if ($question->form->state === 'DEPLOYED') {
            return response()->json(['message' => 'No se puede cambiar preguntas de un formulario implementado'], 403);
        }

        $question->delete();

        return response()->json(null, 204);
    }

    #[OA\Get(path: '/forms/{id}/shares', summary: 'Listar usuarios invitados', security: [['sanctum' => []]], tags: ['Forms'])]
    public function getShares(Request $request, string $id): JsonResponse
    {
        $form = $this->findViewableForm($id, $request->user());

        return response()->json($form->shares()->with('user:id,name,email,rol')->get());
    }

    #[OA\Post(path: '/forms/{id}/shares', summary: 'Invitar usuario como editor o lector', security: [['sanctum' => []]], tags: ['Forms'])]
    public function storeShare(Request $request, string $id): JsonResponse
    {
        $form = $this->findEditableForm($id, $request->user());

        $request->validate([
            'email' => 'required|email',
            'role' => 'required|in:EDITOR,LECTOR',
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'No existe un usuario con ese correo'], 404);
        }

        if ((int) $user->id === (int) $form->user_id) {
            return response()->json(['message' => 'No puedes compartir el formulario contigo mismo'], 422);
        }

        $share = FormUserShare::updateOrCreate(
            ['form_id' => $form->id, 'user_id' => $user->id],
            ['role' => $request->role]
        );

        return response()->json($share->load('user:id,name,email,rol'), 201);
    }

    #[OA\Delete(path: '/forms/{id}/shares/{share_id}', summary: 'Retirar invitacion', security: [['sanctum' => []]], tags: ['Forms'])]
    public function destroyShare(Request $request, string $id, string $share_id): JsonResponse
    {
        $form = $this->findEditableForm($id, $request->user());
        $share = FormUserShare::where('form_id', $form->id)->findOrFail($share_id);
        $share->delete();

        return response()->json(null, 204);
    }

    #[OA\Get(path: '/forms/fetch/{link_uuid}', summary: 'Obtener formulario publico implementado', tags: ['Forms'])]
    public function fetchForm(string $link_uuid): JsonResponse
    {
        $form = Form::where('link_uuid', $link_uuid)
            ->where('state', 'DEPLOYED')
            ->with(['questions' => fn($q) => $q->orderBy('order')])
            ->firstOrFail();

        return response()->json($form);
    }

    #[OA\Post(path: '/forms/submit/{link_uuid}', summary: 'Enviar respuesta publica', tags: ['Forms'])]
    public function submitResponse(Request $request, string $link_uuid): JsonResponse
    {
        $form = Form::where('link_uuid', $link_uuid)->where('state', 'DEPLOYED')->firstOrFail();

        $response = FormResponse::create([
            'form_id' => $form->id,
            'data' => $request->data ?? [],
        ]);

        return response()->json(['message' => 'Respuesta guardada', 'id' => $response->id], 201);
    }

    #[OA\Get(path: '/forms/{id}/responses', summary: 'Listar respuestas', security: [['sanctum' => []]], tags: ['Forms'])]
    public function getResponses(Request $request, string $id): JsonResponse
    {
        $form = $this->findViewableForm($id, $request->user());
        $form->load('questions');

        return response()->json([
            'questions' => $form->questions,
            'responses' => $form->responses()->orderBy('created_at', 'desc')->get(),
        ]);
    }

    #[OA\Get(path: '/forms/{id}/stats', summary: 'Obtener estadisticas basicas de respuestas', security: [['sanctum' => []]], tags: ['Forms'])]
    public function getStats(Request $request, string $id): JsonResponse
    {
        $form = $this->findViewableForm($id, $request->user());
        $form->load('questions', 'responses');
        $stats = [];

        foreach ($form->questions as $q) {
            if (!in_array($q->type, ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LIKERT'], true)) {
                continue;
            }

            $counts = [];
            foreach ($form->responses as $r) {
                $answer = $r->data[$q->id] ?? null;
                foreach ((array) $answer as $value) {
                    if ($value !== null && $value !== '') {
                        $counts[$value] = ($counts[$value] ?? 0) + 1;
                    }
                }
            }
            $stats[$q->id] = $counts;
        }

        return response()->json($stats);
    }

    #[OA\Get(path: '/forms/{id}/export', summary: 'Exportar respuestas CSV/XLSX', security: [['sanctum' => []]], tags: ['Forms'])]
    public function exportResponses(Request $request, string $id)
    {
        $form = $this->findViewableForm($id, $request->user());
        $form->load(['questions' => fn($q) => $q->orderBy('order'), 'responses']);

        $format = strtolower($request->query('format', 'csv'));
        $exportData = $this->buildExportMatrix($form);
        $filename = Str::slug($form->title) . '_respuestas_' . now()->format('Y-m-d');

        if ($format === 'xlsx' || $format === 'excel') {
            $export = new class($exportData['rows'], $exportData['headers']) implements FromArray, WithHeadings {
                public function __construct(private array $rows, private array $headers) {}
                public function array(): array { return $this->rows; }
                public function headings(): array { return $this->headers; }
            };

            return Excel::download($export, "{$filename}.xlsx");
        }

        return response()->streamDownload(function () use ($exportData) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, $exportData['headers']);
            foreach ($exportData['rows'] as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, "{$filename}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function findViewableForm(string $id, User $user): Form
    {
        $form = Form::findOrFail($id);
        $this->abortUnlessCanView($form, $user);

        return $form;
    }

    private function findEditableForm(string $id, User $user): Form
    {
        $form = Form::findOrFail($id);
        $this->abortUnlessCanEdit($form, $user);

        return $form;
    }

    private function abortUnlessCanView(Form $form, User $user): void
    {
        if ($user->isSuperAdmin() || (int) $form->user_id === (int) $user->id || $this->shareRole($form, $user) !== null) {
            return;
        }

        abort(response()->json(['message' => 'No tienes permisos para ver este formulario'], 403));
    }

    private function abortUnlessCanEdit(Form $form, User $user): void
    {
        $role = $this->shareRole($form, $user);
        if ((int) $form->user_id === (int) $user->id || $role === 'EDITOR') {
            return;
        }

        abort(response()->json(['message' => 'No tienes permisos para editar este formulario'], 403));
    }

    private function shareRole(Form $form, User $user): ?string
    {
        return FormUserShare::where('form_id', $form->id)
            ->where('user_id', $user->id)
            ->value('role');
    }

    private function buildExportMatrix(Form $form): array
    {
        $headers = ['_id', '_submitted'];
        $columnMap = [];

        foreach ($form->questions as $question) {
            if ($question->type === 'MULTIPLE_CHOICE' && is_array($question->options)) {
                foreach ($question->options as $option) {
                    $headers[] = "{$question->label}/{$option}";
                    $columnMap[] = ['type' => 'multi_option', 'question_id' => $question->id, 'option' => $option];
                }
                $headers[] = $question->label;
                $columnMap[] = ['type' => 'multi_summary', 'question_id' => $question->id];
            } else {
                $headers[] = $question->label;
                $columnMap[] = ['type' => 'simple', 'question_id' => $question->id];
            }
        }

        $rows = [];
        foreach ($form->responses as $response) {
            $row = [$response->id, $response->created_at?->toDateTimeString() ?? ''];

            foreach ($columnMap as $col) {
                $answer = $response->data[$col['question_id']] ?? null;
                if ($col['type'] === 'multi_option') {
                    $selected = is_array($answer) ? $answer : ($answer ? [$answer] : []);
                    $row[] = in_array($col['option'], $selected, true) ? 1 : 0;
                } elseif (is_array($answer)) {
                    $row[] = implode(' ', $answer);
                } else {
                    $row[] = $answer ?? '';
                }
            }

            $rows[] = $row;
        }

        return ['headers' => $headers, 'rows' => $rows];
    }
}
