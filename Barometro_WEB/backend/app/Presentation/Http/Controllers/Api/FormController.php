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
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Facades\Excel;
use OpenApi\Attributes as OA;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

#[OA\Tag(name: 'Forms', description: 'Formularios dinamicos, publicacion, respuestas y comparticion')]
class FormController extends Controller
{
    #[OA\Get(path: '/forms', summary: 'Listar formularios propios y compartidos', security: [['sanctum' => []]], tags: ['Forms'])]
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return response()->json([
                'my_forms' => Form::with(['owner:id,name,email,rol', 'project:id,name'])->withCount('responses')->latest()->get(),
                'shared_forms' => [],
            ]);
        }

        $myForms = Form::query()
            ->when($user->isProjectLeader(), function ($query) use ($user) {
                $projectIds = $user->ledProjects()->pluck('projects.id');

                $query->where(function ($inner) use ($user, $projectIds) {
                    $inner->where('user_id', $user->id);
                    if ($projectIds->isNotEmpty()) {
                        $inner->orWhereIn('project_id', $projectIds);
                    }
                });
            }, fn($query) => $query->where('user_id', $user->id))
            ->with(['owner:id,name,email,rol', 'project:id,name'])
            ->withCount('responses')
            ->latest()
            ->get();

        $sharedForms = Form::whereHas('shares', fn($q) => $q->where('user_id', $user->id))
            ->with(['owner:id,name,email,rol', 'project:id,name'])
            ->withCount('responses')
            ->latest()
            ->get()
            ->map(function (Form $form) use ($user) {
                $form->setAttribute('access_role', $this->shareRole($form, $user));

                return $form;
            });

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
            'project_id' => 'required|uuid|exists:projects,id',
            'step_by_step' => 'sometimes|boolean',
        ]);

        $projectId = $request->input('project_id');
        $user = $request->user();

        if ($user->isUser()) {
            return response()->json(['message' => 'Los usuarios recolectores no pueden crear formularios'], 403);
        }

        if (!$user->isSuperAdmin() && !$user->isAdmin() && !$user->leadsProject($projectId)) {
            return response()->json(['message' => 'No tienes permisos para crear formularios en este proyecto'], 403);
        }

        $form = Form::create([
            'title' => $request->title,
            'description' => $request->description,
            'user_id' => $user->id,
            'project_id' => $projectId,
            'state' => 'DRAFT',
            'step_by_step' => $request->boolean('step_by_step'),
        ]);

        return response()->json($form, 201);
    }

    #[OA\Get(path: '/forms/{id}', summary: 'Ver detalle de formulario', security: [['sanctum' => []]], tags: ['Forms'])]
    public function show(Request $request, string $id): JsonResponse
    {
        $form = $this->findViewableForm($id, $request->user());
        $form->load(['owner:id,name,email,rol', 'project:id,name', 'questions' => fn($q) => $q->orderBy('order'), 'shares.user:id,name,email,rol']);

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
            'step_by_step' => 'sometimes|boolean',
        ]);

        $form->update($request->only(['title', 'description', 'step_by_step']));

        return response()->json($form);
    }

    #[OA\Delete(path: '/forms/{id}', summary: 'Eliminar formulario propio o cualquier formulario como super admin', security: [['sanctum' => []]], tags: ['Forms'])]
    public function destroy(Request $request, string $id): JsonResponse
    {
        $form = Form::findOrFail($id);
        $user = $request->user();

        if (!$this->canDeleteForm($form, $user)) {
            return response()->json(['message' => 'No tienes permisos para eliminar este formulario'], 403);
        }

        if ($form->state === 'DEPLOYED') {
            return response()->json(['message' => 'Archiva el formulario antes de eliminarlo permanentemente'], 422);
        }

        $form->delete();

        return response()->json(null, 204);
    }

    #[OA\Post(path: '/forms/{id}/deploy', summary: 'Implementar formulario y generar enlace publico', security: [['sanctum' => []]], tags: ['Forms'])]
    public function deploy(Request $request, string $id): JsonResponse
    {
        $form = $this->findLifecycleManageableForm($id, $request->user());

        if (!in_array($form->state, ['DRAFT', 'ARCHIVED'], true)) {
            return response()->json(['message' => 'El formulario ya esta implementado'], 422);
        }

        $form->update([
            'state' => 'DEPLOYED',
            'link_uuid' => $form->link_uuid ?? Str::uuid(),
        ]);

        return response()->json($form);
    }

    #[OA\Post(path: '/forms/{id}/archive', summary: 'Archivar formulario', security: [['sanctum' => []]], tags: ['Forms'])]
    public function archive(Request $request, string $id): JsonResponse
    {
        $form = $this->findLifecycleManageableForm($id, $request->user());

        if ($form->state !== 'DEPLOYED') {
            return response()->json(['message' => 'Solo se puede archivar un formulario implementado'], 422);
        }

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
            'branch_rules' => 'nullable|array',
            'branch_rules.*.option_index' => 'required_with:branch_rules|integer|min:0',
            'branch_rules.*.action' => 'nullable|in:CONTINUE,GO_TO,END_FORM',
            'branch_rules.*.next_question_id' => 'nullable|uuid',
        ]);

        $question = $form->questions()->create($request->only([
            'type',
            'label',
            'order',
            'required',
            'options',
            'branch_rules',
        ]));

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

        $request->validate([
            'type' => 'sometimes|in:MULTIPLE_CHOICE,SINGLE_CHOICE,LIKERT,TEXT,NUMBER',
            'label' => 'sometimes|string',
            'order' => 'sometimes|integer',
            'required' => 'sometimes|boolean',
            'options' => 'sometimes|nullable|array',
            'branch_rules' => 'sometimes|nullable|array',
            'branch_rules.*.option_index' => 'required_with:branch_rules|integer|min:0',
            'branch_rules.*.action' => 'nullable|in:CONTINUE,GO_TO,END_FORM',
            'branch_rules.*.next_question_id' => 'nullable|uuid',
        ]);

        $question->update($request->only([
            'type',
            'label',
            'order',
            'required',
            'options',
            'branch_rules',
        ]));

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
        $form = $this->findShareManageableForm($id, $request->user());

        return response()->json($form->shares()->with('user:id,name,email,rol')->get());
    }

    #[OA\Post(path: '/forms/{id}/shares', summary: 'Asignar usuario como editor o recolector', security: [['sanctum' => []]], tags: ['Forms'])]
    public function storeShare(Request $request, string $id): JsonResponse
    {
        $form = $this->findShareManageableForm($id, $request->user());

        $request->validate([
            'email' => 'required|email',
            'role' => 'required|in:EDITOR,RECOLECTOR',
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'No existe un usuario con ese correo'], 404);
        }

        if ((int) $user->id === (int) $form->user_id) {
            return response()->json(['message' => 'No puedes compartir el formulario contigo mismo'], 422);
        }

        if (!$user->isUser()) {
            return response()->json(['message' => 'Solo usuarios recolectores pueden recibir permisos por formulario'], 422);
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
        $form = $this->findShareManageableForm($id, $request->user());
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
        $form = Form::where('link_uuid', $link_uuid)
            ->where('state', 'DEPLOYED')
            ->with(['questions' => fn($q) => $q->orderBy('order')])
            ->firstOrFail();

        $data = $request->data ?? [];
        $missing = $this->missingRequiredQuestions($form, is_array($data) ? $data : []);

        if (!empty($missing)) {
            return response()->json([
                'message' => 'Completa las preguntas obligatorias antes de enviar',
                'missing' => $missing,
            ], 422);
        }

        $response = FormResponse::create([
            'form_id' => $form->id,
            'data' => $data,
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

            $counts = array_fill_keys($this->chartOptionsForQuestion($q), 0);
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
            $export = new class($exportData['rows'], $exportData['headers'], $form->title) implements FromArray, ShouldAutoSize, WithHeadings, WithStyles, WithTitle {
                public function __construct(private array $rows, private array $headers, private string $formTitle) {}
                public function array(): array { return $this->rows; }
                public function headings(): array { return $this->headers; }
                public function title(): string
                {
                    $title = preg_replace('/[\\\\\/?*\[\]:]/', '', $this->formTitle) ?: 'Respuestas';

                    return mb_substr($title, 0, 31);
                }
                public function styles(Worksheet $sheet): array
                {
                    $sheet->freezePane('A2');
                    $sheet->setAutoFilter($sheet->calculateWorksheetDimension());

                    return [
                        1 => ['font' => ['bold' => true]],
                    ];
                }
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

    private function findShareManageableForm(string $id, User $user): Form
    {
        $form = Form::findOrFail($id);
        $this->abortUnlessCanManageShares($form, $user);

        return $form;
    }

    private function findLifecycleManageableForm(string $id, User $user): Form
    {
        $form = Form::findOrFail($id);
        $this->abortUnlessCanManageLifecycle($form, $user);

        return $form;
    }

    private function abortUnlessCanView(Form $form, User $user): void
    {
        if ($user->isSuperAdmin() || $user->isAdmin() || $user->leadsProject($form->project_id) || (int) $form->user_id === (int) $user->id || $this->shareRole($form, $user) !== null) {
            return;
        }

        abort(response()->json(['message' => 'No tienes permisos para ver este formulario'], 403));
    }

    private function abortUnlessCanEdit(Form $form, User $user): void
    {
        $role = $this->shareRole($form, $user);
        if ($user->isSuperAdmin() || $user->isAdmin() || $user->leadsProject($form->project_id) || ((int) $form->user_id === (int) $user->id && !$user->isUser()) || $role === 'EDITOR') {
            return;
        }

        abort(response()->json(['message' => 'No tienes permisos para editar este formulario'], 403));
    }

    private function abortUnlessCanManageShares(Form $form, User $user): void
    {
        if ($user->isSuperAdmin() || $user->isAdmin() || $user->leadsProject($form->project_id)) {
            return;
        }

        abort(response()->json(['message' => 'No tienes permisos para gestionar accesos de este formulario'], 403));
    }

    private function abortUnlessCanManageLifecycle(Form $form, User $user): void
    {
        if ($user->isSuperAdmin() || $user->isAdmin() || $user->leadsProject($form->project_id)) {
            return;
        }

        abort(response()->json(['message' => 'No tienes permisos para implementar o archivar este formulario'], 403));
    }

    private function canDeleteForm(Form $form, User $user): bool
    {
        return $user->isSuperAdmin() || $user->isAdmin() || $user->leadsProject($form->project_id) || ((int) $form->user_id === (int) $user->id && !$user->isUser());
    }

    private function shareRole(Form $form, User $user): ?string
    {
        return FormUserShare::where('form_id', $form->id)
            ->where('user_id', $user->id)
            ->value('role');
    }

    private function buildExportMatrix(Form $form): array
    {
        $headers = ['start', 'end'];
        $columnMap = [];

        foreach ($form->questions as $question) {
            $questionLabel = trim((string) $question->label);
            $choiceOptions = $this->normalizeChoiceOptions($question->options);

            if (in_array($question->type, ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'], true) && $choiceOptions !== []) {
                $isMultiChoice = $question->type === 'MULTIPLE_CHOICE';
                $headers[] = $question->label;
                $columnMap[] = [
                    'type' => 'choice_summary',
                    'question_id' => $question->id,
                    'is_multi' => $isMultiChoice,
                ];

                foreach ($choiceOptions as $option) {
                    $headers[] = "{$questionLabel}/{$option}";
                    $columnMap[] = [
                        'type' => 'choice_option',
                        'question_id' => $question->id,
                        'option' => $option,
                        'is_multi' => $isMultiChoice,
                    ];
                }
            } elseif ($question->type === 'LIKERT' && is_array($question->options) && isset($question->options['rows']) && is_array($question->options['rows'])) {
                foreach ($question->options['rows'] as $rowLabel) {
                    $headers[] = "{$questionLabel}/{$rowLabel}";
                    $columnMap[] = ['type' => 'likert_row', 'question_id' => $question->id, 'row' => $rowLabel];
                }
            } else {
                $headers[] = $question->label;
                $columnMap[] = ['type' => 'simple', 'question_id' => $question->id];
            }
        }

        $headers = array_merge($headers, [
            '_id',
            '_uuid',
            '_submission_time',
            '_validation_status',
            '_notes',
            '_status',
            '_submitted_by',
            '__version__',
            '_tags',
            'meta/rootUuid',
            '_index',
        ]);

        $rows = [];
        $versionToken = $this->exportVersionToken($form);

        foreach ($form->responses as $index => $response) {
            $submittedAt = $this->toExcelSerialDate($response->created_at);
            $row = [$submittedAt, $submittedAt];

            foreach ($columnMap as $col) {
                $answer = $response->data[$col['question_id']] ?? null;

                if ($col['type'] === 'choice_summary') {
                    $row[] = $this->stringifyAnswer($answer);
                    continue;
                }

                if ($col['type'] === 'choice_option') {
                    $row[] = $this->isOptionSelected($answer, (string) $col['option'], (bool) ($col['is_multi'] ?? false)) ? 1 : 0;
                    continue;
                }

                if ($col['type'] === 'likert_row') {
                    $row[] = is_array($answer) ? ($answer[$col['row']] ?? '') : '';
                    continue;
                }

                $row[] = $this->stringifyAnswer($answer);
            }

            $row = array_merge($row, [
                $this->legacyNumericResponseId($response, $index),
                $response->id,
                $submittedAt,
                '',
                '',
                'submitted_via_web',
                '',
                $versionToken,
                '',
                "uuid:{$response->id}",
                $index + 1,
            ]);

            $rows[] = $row;
        }

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * @param mixed $options
     * @return array<int, string>
     */
    private function normalizeChoiceOptions(mixed $options): array
    {
        if (!is_array($options)) {
            return [];
        }

        return array_values(array_map(
            fn($option) => trim((string) $option),
            array_filter($options, fn($option) => is_scalar($option) && trim((string) $option) !== ''),
        ));
    }

    private function stringifyAnswer(mixed $answer): string
    {
        if ($answer === null) {
            return '';
        }

        if (is_scalar($answer)) {
            return trim((string) $answer);
        }

        if (!is_array($answer)) {
            return '';
        }

        return implode(' ', array_values(array_filter(array_map(function ($value) {
            if (is_scalar($value)) {
                return trim((string) $value);
            }

            if (is_array($value)) {
                return implode(' ', array_values(array_filter(array_map(
                    fn($inner) => is_scalar($inner) ? trim((string) $inner) : '',
                    $value,
                ), fn($inner) => $inner !== '')));
            }

            return '';
        }, $answer), fn($value) => $value !== '')));
    }

    private function isOptionSelected(mixed $answer, string $option, bool $isMultiChoice): bool
    {
        $normalizedOption = trim($option);
        if ($normalizedOption === '') {
            return false;
        }

        if ($isMultiChoice) {
            $selected = is_array($answer) ? $answer : ($answer !== null && $answer !== '' ? [$answer] : []);

            foreach ($selected as $value) {
                if (is_scalar($value) && trim((string) $value) === $normalizedOption) {
                    return true;
                }
            }

            return false;
        }

        return is_scalar($answer) && trim((string) $answer) === $normalizedOption;
    }

    private function toExcelSerialDate(mixed $date): string
    {
        if (!$date instanceof \DateTimeInterface) {
            return '';
        }

        $seconds = (float) $date->format('U');
        $microseconds = ((float) $date->format('u')) / 1000000;
        $serial = ($seconds + $microseconds) / 86400 + 25569;

        return rtrim(rtrim(number_format($serial, 15, '.', ''), '0'), '.');
    }

    private function exportVersionToken(Form $form): string
    {
        $source = "{$form->id}|{$form->updated_at?->timestamp}|{$form->questions()->count()}";

        return 'vv' . substr(hash('sha256', $source), 0, 16);
    }

    private function legacyNumericResponseId(FormResponse $response, int $index): int
    {
        $hash = abs((int) crc32((string) $response->id));
        if ($hash > 0) {
            return $hash;
        }

        return $index + 1;
    }

    private function missingRequiredQuestions(Form $form, array $data): array
    {
        $missing = [];

        foreach ($this->questionsInSubmissionFlow($form, $data) as $question) {
            if (!$question->required) {
                continue;
            }

            $answer = $data[$question->id] ?? null;
            if (!$this->hasRequiredAnswer($question, $answer)) {
                $missing[] = [
                    'id' => $question->id,
                    'label' => $question->label,
                ];
            }
        }

        return $missing;
    }

    /**
     * @return array<int, FormQuestion>
     */
    private function questionsInSubmissionFlow(Form $form, array $data): array
    {
        $questions = $form->questions()->orderBy('order')->get()->values();

        if (!$form->step_by_step) {
            return $questions->all();
        }

        $questionIndexes = $questions->pluck('id')->flip()->all();
        $conditionalTargetIds = $this->conditionalTargetIds($questions->all());
        $flow = [];
        $currentIndex = 0;
        $visited = [];

        while ($currentIndex < $questions->count()) {
            /** @var FormQuestion $question */
            $question = $questions[$currentIndex];

            if (isset($visited[$question->id])) {
                break;
            }

            $visited[$question->id] = true;
            $flow[] = $question;

            $nextIndex = $this->nextSequentialIndex($questions->all(), $currentIndex, $conditionalTargetIds);

            if ($question->type === 'SINGLE_CHOICE') {
                $selectedIndex = $this->selectedOptionIndex($question, $data[$question->id] ?? null);
                $branchDecision = $this->branchDecisionForQuestion($question, $selectedIndex);

                if (($branchDecision['action'] ?? 'CONTINUE') === 'END_FORM') {
                    $nextIndex = $questions->count();
                } else {
                    $branchTarget = $branchDecision['target'] ?? null;
                    if ($branchTarget !== null && isset($questionIndexes[$branchTarget]) && $questionIndexes[$branchTarget] > $currentIndex) {
                        $nextIndex = $questionIndexes[$branchTarget];
                    }
                }
            }

            if ($nextIndex <= $currentIndex) {
                break;
            }

            $currentIndex = $nextIndex;
        }

        return $flow;
    }

    /**
     * @param array<int, FormQuestion> $questions
     * @return array<string, bool>
     */
    private function conditionalTargetIds(array $questions): array
    {
        $targets = [];

        foreach ($questions as $question) {
            if ($question->type !== 'SINGLE_CHOICE' || !is_array($question->branch_rules)) {
                continue;
            }

            foreach ($question->branch_rules as $rule) {
                if (!is_array($rule)) {
                    continue;
                }

                $action = $rule['action'] ?? ((isset($rule['next_question_id']) && is_string($rule['next_question_id']) && $rule['next_question_id'] !== '') ? 'GO_TO' : 'CONTINUE');
                $target = $rule['next_question_id'] ?? null;

                if ($action === 'GO_TO' && is_string($target) && $target !== '') {
                    $targets[$target] = true;
                }
            }
        }

        return $targets;
    }

    /**
     * @param array<int, FormQuestion> $questions
     * @param array<string, bool> $conditionalTargetIds
     */
    private function nextSequentialIndex(array $questions, int $currentIndex, array $conditionalTargetIds): int
    {
        $nextIndex = $currentIndex + 1;

        while ($nextIndex < count($questions)) {
            $candidate = $questions[$nextIndex] ?? null;
            if (!$candidate || !isset($conditionalTargetIds[$candidate->id])) {
                break;
            }

            $nextIndex++;
        }

        return $nextIndex;
    }

    private function selectedOptionIndex(FormQuestion $question, mixed $answer): ?int
    {
        if (!is_array($question->options)) {
            return null;
        }

        $options = array_values(array_filter($question->options, fn($option) => is_scalar($option) && $option !== ''));
        $answerValue = is_scalar($answer) ? trim((string) $answer) : '';

        if ($answerValue === '') {
            return null;
        }

        foreach ($options as $index => $option) {
            if ((string) $option === $answerValue) {
                return $index;
            }
        }

        return null;
    }

    /**
     * @return array{action: string, target: ?string}
     */
    private function branchDecisionForQuestion(FormQuestion $question, ?int $selectedIndex): array
    {
        if ($selectedIndex === null || !is_array($question->branch_rules)) {
            return ['action' => 'CONTINUE', 'target' => null];
        }

        foreach ($question->branch_rules as $rule) {
            if (!is_array($rule)) {
                continue;
            }

            $optionIndex = $rule['option_index'] ?? $rule['optionIndex'] ?? null;
            if ((int) $optionIndex !== $selectedIndex) {
                continue;
            }

            $action = $rule['action'] ?? 'CONTINUE';
            if (!in_array($action, ['CONTINUE', 'GO_TO', 'END_FORM'], true)) {
                $action = 'CONTINUE';
            }

            $target = $rule['next_question_id'] ?? $rule['nextQuestionId'] ?? null;
            $resolvedTarget = is_string($target) && $target !== '' ? $target : null;

            if ($action !== 'GO_TO') {
                $resolvedTarget = null;
            }

            return ['action' => $action, 'target' => $resolvedTarget];
        }

        return ['action' => 'CONTINUE', 'target' => null];
    }

    private function hasRequiredAnswer(FormQuestion $question, mixed $answer): bool
    {
        if ($question->type === 'MULTIPLE_CHOICE') {
            return is_array($answer) && count(array_filter($answer, fn($value) => $value !== null && $value !== '')) > 0;
        }

        if ($question->type === 'LIKERT') {
            $rows = is_array($question->options) && isset($question->options['rows']) && is_array($question->options['rows'])
                ? $question->options['rows']
                : [$question->label];

            if (!is_array($answer)) {
                return false;
            }

            foreach ($rows as $row) {
                if (!isset($answer[$row]) || $answer[$row] === null || $answer[$row] === '') {
                    return false;
                }
            }

            return true;
        }

        return $answer !== null && trim((string) $answer) !== '';
    }

    private function chartOptionsForQuestion(FormQuestion $question): array
    {
        if (!is_array($question->options)) {
            return [];
        }

        if ($question->type === 'LIKERT' && isset($question->options['columns']) && is_array($question->options['columns'])) {
            return array_values(array_filter($question->options['columns'], fn($option) => $option !== null && $option !== ''));
        }

        return array_values(array_filter($question->options, fn($option) => is_scalar($option) && $option !== ''));
    }
}
