import { SUPPORTED_LOCALES } from "../core/02-locales.js";

export const I18N_MESSAGE_ROWS = Object.freeze([
  ["boot.ready", "Editor ready", "Editor pronto", "Editor listo"],
  ["boot.interrupted", "Startup interrupted", "Inicialização interrompida", "Inicio interrumpido"],
  ["boot.failedTitle", "The editor could not start", "Não foi possível iniciar o editor", "No se pudo iniciar el editor"],
  ["boot.failedWithReason", "The local runtime failed during startup: {reason}", "O runtime local falhou durante a abertura: {reason}", "El entorno local falló durante el inicio: {reason}"],
  ["boot.failed", "The local runtime failed while opening this artifact.", "O runtime local falhou durante a abertura deste artefato.", "El entorno local falló al abrir este artefacto."],
  ["boot.statusFailed", "Editor startup failed: {reason}", "Falha ao iniciar o editor: {reason}", "Error al iniciar el editor: {reason}"],
  ["status.focusEditor", "SQL editor focused.", "Foco no editor de instruções SQL.", "Editor SQL enfocado."],
  ["status.workerCancelled", "SQL execution stopped.", "Execução SQL interrompida.", "Ejecución SQL detenida."],
  ["status.populationCancelled", "Table population stopped.", "População da tabela interrompida.", "Población de tabla detenida."],
  ["toast.executionStopped", "Execution stopped", "Execução interrompida", "Ejecución detenida"],
  ["toast.populationStopped", "Population stopped", "População interrompida", "Población detenida"],
  ["toast.executionStoppedBody", "The query was stopped. No new results were loaded.", "A consulta foi parada. Nenhum novo resultado foi carregado.", "La consulta se detuvo. No se cargaron resultados nuevos."],
  ["toast.populationStoppedBody", "The operation was canceled and no partial rows were applied to the current database.", "A operação foi cancelada e nenhuma linha parcial foi aplicada ao banco atual.", "La operación se canceló y no se aplicaron filas parciales a la base de datos actual."],
  ["status.operationRunning", "A database operation is already running.", "Já existe uma operação de banco em execução.", "Ya hay una operación de base de datos en curso."],
  ["status.queryRunning", "A query is already running. Wait for it to finish.", "Já existe uma consulta em execução. Aguarde finalizar.", "Ya hay una consulta en ejecución. Espere a que termine."],
  ["status.databaseRequired", "Open a SQLite database before continuing.", "Carregue um banco SQLite antes de continuar.", "Abra una base de datos SQLite antes de continuar."],
  ["status.queryRequired", "Enter a SQL statement.", "Digite uma consulta SQL.", "Escriba una sentencia SQL."],
  ["status.runningStatement", "Running statement {current}/{total}...", "Executando consulta {current}/{total}...", "Ejecutando sentencia {current}/{total}..."],
  ["status.runningSql", "Running SQL statement. Please wait...", "Executando consulta SQL. Aguarde...", "Ejecutando sentencia SQL. Espere..."],
  ["status.executionSummary", "{queries} statement(s) completed in {elapsed}. {rows} total row(s).", "{queries} consulta(s) executada(s) em {elapsed}. {rows} registro(s) no total.", "{queries} sentencia(s) completada(s) en {elapsed}. {rows} fila(s) en total."],
  ["status.sqlExecutionFailed", "SQL execution failed.", "Erro ao executar SQL.", "Error al ejecutar SQL."],
  ["toast.sqlExecutionFailed", "SQL execution failed", "Erro ao executar SQL", "Error al ejecutar SQL"],
  ["toast.memoryChanges", "Changes are in memory", "Alterações em memória", "Los cambios están en memoria"],
  ["toast.saveDatabaseHint", "Use Save .db to persist the changes to a local file.", "Use Salvar .db para persistir as alterações no arquivo local.", "Use Guardar .db para conservar los cambios en un archivo local."],
  ["error.workerUnknown", "Unknown SQL worker error.", "Erro desconhecido no worker SQL.", "Error desconocido del worker SQL."],
  ["error.databaseNotLoaded", "The SQLite database is not loaded in memory.", "O banco SQLite não está carregado em memória.", "La base de datos SQLite no está cargada en memoria."],
  ["preferences.themeDarkActive", "Dark theme active", "Tema escuro ativo", "Tema oscuro activo"],
  ["preferences.themeLightActive", "Light theme active", "Tema claro ativo", "Tema claro activo"],
  ["preferences.sessionRestoreOn", "The session will be restored when the editor reopens", "A sessão será restaurada ao reabrir", "La sesión se restaurará al volver a abrir"],
  ["preferences.sessionRestoreOff", "The session will not be restored when the editor reopens", "A sessão não será restaurada ao reabrir", "La sesión no se restaurará al volver a abrir"],
  ["status.sessionOff", "The session will not be saved. The editor will start empty when reopened.", "A sessão não será salva. Ao reabrir, o editor começará vazio.", "La sesión no se guardará. El editor se iniciará vacío al volver a abrir."],
  ["status.sessionOn", "The session will be saved and restored when the editor reopens.", "A sessão será salva e restaurada ao reabrir.", "La sesión se guardará y restaurará al volver a abrir."],
  ["status.preferencesSaved", "Initial preferences saved.", "Preferências iniciais salvas.", "Preferencias iniciales guardadas."],
  ["status.themeApplied", "{theme} theme applied.", "Tema {theme} aplicado.", "Tema {theme} aplicado."],
  ["theme.dark", "Dark", "escuro", "oscuro"],
  ["theme.light", "Light", "claro", "claro"],
  ["status.settingsPresetFocused", "Settings opened at the tab-name preset.", "Configurações abertas no preset de nomes das abas.", "Configuración abierta en el conjunto de nombres de pestañas."],
  ["status.historyLoaded", "Query loaded from history into the active tab.", "Consulta carregada do histórico para a aba ativa.", "Consulta cargada del historial en la pestaña activa."],
  ["status.quickHistoryLoaded", "Query loaded from quick history into the active tab.", "Consulta carregada do histórico rápido para a aba ativa.", "Consulta cargada del historial rápido en la pestaña activa."],
  ["status.favoriteLoaded", "Favorite query loaded into the active tab.", "Consulta favorita carregada na aba ativa.", "Consulta favorita cargada en la pestaña activa."],
  ["status.historyCleared", "Query history cleared.", "Histórico de consultas limpo.", "Historial de consultas borrado."],
  ["status.favoriteRequiresSuccess", "Only successful queries can be added to favorites.", "Só é possível favoritar consultas executadas com sucesso.", "Solo se pueden marcar como favoritas las consultas ejecutadas correctamente."],
  ["history.noFilterResults", "No queries match the filter.", "Nenhuma consulta encontrada para o filtro.", "Ninguna consulta coincide con el filtro."],
  ["history.error", "Error", "Erro", "Error"],
  ["history.success", "Success", "Sucesso", "Correcto"],
  ["history.load", "Load query into the editor", "Carregar consulta no editor", "Cargar consulta en el editor"],
  ["history.escapeCloses", "Esc closes", "Esc fecha", "Esc cierra"],
  ["favorites.item", "Favorite", "Favorita", "Favorita"],
  ["favorites.save", "Save to favorites", "Salvar nos favoritos", "Guardar en favoritas"],
  ["favorites.remove", "Remove from favorites", "Remover dos favoritos", "Quitar de favoritas"],
  ["favorites.load", "Load", "Carregar", "Cargar"],
  ["settings.exportNever", "Last export: never", "Última exportação: nunca", "Última exportación: nunca"],
  ["settings.exportAt", "Last export: {date}", "Última exportação: {date}", "Última exportación: {date}"],
  ["settings.exportAtRelative", "Last export: {date} ({relative})", "Última exportação: {date} ({relative})", "Última exportación: {date} ({relative})"],
  ["settings.justNow", "just now", "agora há pouco", "ahora mismo"],
  ["settings.scopeRequiredExport", "Select at least one scope to export settings.", "Selecione pelo menos um escopo para exportar configurações.", "Seleccione al menos un ámbito para exportar la configuración."],
  ["settings.scopeRequiredImport", "Select at least one scope before importing settings.", "Selecione pelo menos um escopo antes de importar configurações.", "Seleccione al menos un ámbito antes de importar la configuración."],
  ["settings.exported", "Settings exported.", "Configurações exportadas.", "Configuración exportada."],
  ["settings.imported", "Settings imported successfully.", "Configurações importadas com sucesso.", "Configuración importada correctamente."],
  ["settings.importFailed", "Settings import was rejected. The current settings were preserved.", "A importação foi rejeitada. As configurações atuais foram preservadas.", "La importación fue rechazada. Se conservaron los ajustes actuales."],
  ["tabs.defaultTitle", "SQL statements", "Instruções SQL", "Sentencias SQL"],
  ["tabs.unsavedClose", "The edited query in {tab} will be lost when this tab closes.", "A consulta em edição na aba {tab} será perdida ao fechar.", "La consulta editada en la pestaña {tab} se perderá al cerrarla."],
  ["tabs.closed", "Tab closed.", "Aba fechada.", "Pestaña cerrada."],
  ["tabs.nameRequired", "The tab name cannot be empty.", "O nome da aba não pode ficar vazio.", "El nombre de la pestaña no puede estar vacío."],
  ["tabs.renamed", "Tab renamed to {title}.", "Aba renomeada para {title}.", "Pestaña renombrada a {title}."],
  ["tabs.moved", "Tab moved: {title}.", "Aba movida: {title}.", "Pestaña movida: {title}."],
  ["tabs.closeLabel", "Close tab", "Fechar aba", "Cerrar pestaña"],
  ["file.waitForExecution", "Wait for SQL execution to finish before opening another file.", "Aguarde a execução SQL finalizar antes de abrir outro arquivo.", "Espere a que termine la ejecución SQL antes de abrir otro archivo."],
  ["file.invalidSql", "Unrecognized file. Select a .sql or .txt file.", "Arquivo não reconhecido. Selecione um arquivo .sql ou .txt.", "Archivo no reconocido. Seleccione un archivo .sql o .txt."],
  ["file.loaded", "File loaded in the editor: {name}", "Arquivo carregado no editor: {name}", "Archivo cargado en el editor: {name}"],
  ["file.loadedRunning", "File loaded in the editor: {name}. Running...", "Arquivo carregado no editor: {name}. Executando...", "Archivo cargado en el editor: {name}. Ejecutando..."],
  ["file.openFailed", "Could not open SQL file: {reason}", "Erro ao abrir arquivo SQL: {reason}", "No se pudo abrir el archivo SQL: {reason}"],
  ["file.openFailedTitle", "Could not open file", "Erro ao abrir arquivo", "No se pudo abrir el archivo"],
  ["clipboard.queryRequired", "There is no query to copy.", "Não há consulta para copiar.", "No hay ninguna consulta para copiar."],
  ["clipboard.queryCopied", "Query copied to the clipboard.", "Consulta copiada para a área de transferência.", "Consulta copiada al portapapeles."],
  ["clipboard.queryCleared", "Query cleared.", "Consulta limpa.", "Consulta borrada."],
  ["clipboard.pasted", "Clipboard content pasted into the editor.", "Conteúdo colado no editor.", "Contenido del portapapeles pegado en el editor."],
  ["clipboard.empty", "The clipboard is empty.", "A área de transferência está vazia.", "El portapapeles está vacío."],
  ["results.exportUnavailable", "There are no records available to export.", "Não há registros disponíveis para exportar.", "No hay registros disponibles para exportar."],
  ["results.selectionCleared", "Selection cleared.", "Seleção limpa.", "Selección borrada."],
  ["results.sortApplied", "Sorting applied: ORDER BY {orderBy}", "Ordenação aplicada: ORDER BY {orderBy}", "Orden aplicado: ORDER BY {orderBy}"],
  ["results.sortCleared", "Sorting cleared.", "Ordenação limpa.", "Orden borrado."],
  ["results.sortClearedFiltered", "Sorting cleared. {count} filtered row(s).", "Ordenação limpa. {count} registro(s) filtrado(s).", "Orden borrado. {count} fila(s) filtrada(s)."],
  ["schema.readFailed", "Database loaded, but the schema could not be read: {reason}", "Banco carregado, mas não foi possível ler o schema: {reason}", "Base de datos cargada, pero no se pudo leer el esquema: {reason}"],
  ["schema.populateTable", "Populate table", "Popular tabela", "Poblar tabla"],
  ["schema.populateTableTitle", "Generate synthetic data for {table}", "Gerar dados sintéticos para {table}", "Generar datos sintéticos para {table}"],
  ["database.loaded", "Database loaded", "Banco carregado", "Base de datos cargada"],
  ["database.readingSchema", "Database loaded. Reading schema...", "Banco carregado. Lendo schema...", "Base de datos cargada. Leyendo el esquema..."],
  ["database.ready", "Database loaded successfully. Press F5 to run the query.", "Banco carregado com sucesso. Use F5 para executar a consulta.", "Base de datos cargada correctamente. Pulse F5 para ejecutar la consulta."],
  ["database.recentRequired", "Choose a recent database from the list.", "Escolha um banco recente na lista.", "Elija una base de datos reciente de la lista."],
  ["database.recentMissing", "The recent item could not be found.", "O item recente não foi encontrado.", "No se encontró el elemento reciente."],
  ["database.reopenDenied", "For security, the browser could not automatically reopen {name}. Choose the SQLite file again.", "Por segurança, o navegador não permitiu reabrir automaticamente {name}. Escolha o arquivo SQLite novamente.", "Por seguridad, el navegador no pudo volver a abrir automáticamente {name}. Elija de nuevo el archivo SQLite."],
  ["database.recentOpenFailed", "Could not open the recent database: {reason}", "Erro ao abrir banco recente: {reason}", "No se pudo abrir la base de datos reciente: {reason}"],
  ["database.switchWait", "Wait for SQL execution to finish before switching databases.", "Aguarde a execução SQL finalizar antes de trocar o banco.", "Espere a que termine la ejecución SQL antes de cambiar de base de datos."],
  ["database.fileChooseFailed", "Could not select the file: {reason}", "Erro ao escolher arquivo: {reason}", "No se pudo seleccionar el archivo: {reason}"],
  ["database.createdReading", "Database created. Reading schema...", "Banco criado. Lendo schema...", "Base de datos creada. Leyendo el esquema..."],
  ["database.created", "New database created in memory: {name}", "Novo banco criado em memória: {name}", "Nueva base de datos creada en memoria: {name}"],
  ["database.saved", "Database saved: {name}", "Banco salvo: {name}", "Base de datos guardada: {name}"],
  ["database.saveRequired", "Open a database before saving a .db file.", "Carregue um banco antes de salvar .db.", "Abra una base de datos antes de guardar un archivo .db."],
  ["database.createWait", "Wait for SQL execution to finish before creating a database.", "Aguarde a execução SQL finalizar antes de criar um novo banco.", "Espere a que termine la ejecución SQL antes de crear una base de datos."],
  ["database.recentCleared", "Recent database list cleared.", "Lista de bancos recentes limpa.", "Lista de bases de datos recientes borrada."],
  ["database.actionFailed", "Database operation failed: {reason}", "A operação no banco falhou: {reason}", "La operación de base de datos falló: {reason}"],
  ["population.wait", "Wait for the current operation to finish before populating a table.", "Aguarde a operação atual finalizar antes de popular uma tabela.", "Espere a que termine la operación actual antes de poblar una tabla."],
  ["population.tableOnly", "Synthetic population is available only for tables.", "A população sintética está disponível apenas para tabelas.", "La población sintética solo está disponible para tablas."],
  ["population.completed", "Table populated", "Tabela populada", "Tabla poblada"],
  ["population.completedBody", "Changes are in memory. Use Save .db to persist them to a local file.", "As alterações estão em memória. Use Salvar .db para persistir no arquivo local.", "Los cambios están en memoria. Use Guardar .db para conservarlos en un archivo local."],
  ["population.failed", "Table population failed", "Falha ao popular tabela", "Error al poblar la tabla"],
  ["population.failedBody", "The transaction was rolled back and no partial rows were applied.", "A transação foi revertida e nenhuma linha parcial foi aplicada.", "La transacción se revirtió y no se aplicaron filas parciales."],
  ["population.progress", "{completed} of {total} rows", "{completed} de {total} registros", "{completed} de {total} filas"],
  ["population.running", "Populating {table}: {completed}/{total}", "Populando {table}: {completed}/{total}", "Poblando {table}: {completed}/{total}"],
  ["sqlMap.openRequiresDatabase", "Open a database before opening SQL Map.", "Carregue um banco antes de abrir o Mapa SQL.", "Abra una base de datos antes de abrir el Mapa SQL."],
  ["sqlMap.relationCancelled", "Virtual relationship creation canceled.", "Criação de relacionamento virtual cancelada.", "Creación de relación virtual cancelada."],
  ["sqlMap.sqlCopied", "Generated SQL copied.", "SQL gerado copiado.", "SQL generado copiado."],
  ["sqlMap.sqlPasted", "Generated SQL pasted into the active tab.", "SQL gerado colado no editor da aba ativa.", "SQL generado pegado en la pestaña activa."],
  ["sqlMap.diagnosticCopied", "Diagnostic SQL copied.", "SQL de diagnóstico copiado.", "SQL de diagnóstico copiado."],
  ["sqlMap.diagnosticOpened", "Diagnostic SQL loaded into the active tab.", "SQL de diagnóstico carregado no editor da aba ativa.", "SQL de diagnóstico cargado en la pestaña activa."],
  ["sqlMap.relationCreated", "Virtual relationship created for this session.", "Relacionamento virtual criado para a sessão atual.", "Relación virtual creada para esta sesión."],
  ["sqlMap.relationRemoved", "Virtual relationship removed.", "Relacionamento virtual removido.", "Relación virtual eliminada."],
  ["sqlMap.relationsCleared", "Session virtual relationships cleared.", "Relacionamentos virtuais da sessão removidos.", "Relaciones virtuales de la sesión eliminadas."],
  ["sqlMap.exportUnavailable", "There is no diagram to export.", "Não há DER para exportar.", "No hay ningún diagrama para exportar."],
  ["sqlMap.compatible", "Compatible", "Compatível", "Compatible"],
  ["sqlMap.suggestion", "Suggestion", "Sugestão", "Sugerencia"],
  ["sqlMap.noSelection", "No tables selected. All tables are initially available.", "Nenhuma tabela selecionada. Todas as tabelas estão disponíveis inicialmente.", "No hay tablas seleccionadas. Todas las tablas están disponibles al inicio."],
  ["sqlMap.selectionSummary", "{tables} selected table(s), {fields} selected field(s). {reachable} table(s) reachable through declared and virtual relationships.", "{tables} tabela(s) selecionada(s), {fields} campo(s) selecionado(s). {reachable} tabela(s) alcançável(is) por relacionamentos declarados e virtuais.", "{tables} tabla(s) seleccionada(s), {fields} campo(s) seleccionado(s). {reachable} tabla(s) accesible(s) mediante relaciones declaradas y virtuales."],
  ["sqlMap.sourceSelected", "Source selected: {table}.{field}. Press Enter on another field to relate it, or Escape to cancel.", "Origem selecionada: {table}.{field}. Pressione Enter em outro campo para relacioná-lo ou Escape para cancelar.", "Origen seleccionado: {table}.{field}. Pulse Intro en otro campo para relacionarlo o Escape para cancelar."],
  ["sqlMap.generatedPlaceholder", "-- select tables or fields in the map", "-- selecione tabelas ou campos no mapa", "-- seleccione tablas o campos en el mapa"],
  ["find.replaced", "{count} occurrence(s) replaced.", "{count} ocorrência(s) substituída(s).", "{count} coincidencia(s) reemplazada(s)."]
  , ["editor.runTitle", "Run SQL statements (F5)", "Executar instruções SQL (F5)", "Ejecutar sentencias SQL (F5)"]
  , ["history.buttonTitle", "History of recently executed queries", "Histórico das últimas consultas executadas", "Historial de consultas ejecutadas recientemente"]
  , ["editor.copyTitle", "Copy the full query to the clipboard (F6)", "Copiar a consulta inteira para a área de transferência (F6)", "Copiar la consulta completa al portapapeles (F6)"]
  , ["editor.clearPasteTitle", "Clear the editor and paste the clipboard content (F8)", "Limpar o editor e colar o conteúdo da área de transferência (F8)", "Limpiar el editor y pegar el contenido del portapapeles (F8)"]
  , ["settings.buttonTitle", "Editor settings", "Configurações do editor", "Configuración del editor"]
  , ["editor.ariaLabel", "SQL statement editor", "Editor de instruções SQL", "Editor de sentencias SQL"]
  , ["editor.findNext", "Next occurrence", "Próxima ocorrência", "Coincidencia siguiente"]
  , ["history.quickLabel", "Quick query history", "Histórico rápido de consultas", "Historial rápido de consultas"]
  , ["schema.quickGuideHtml", "Use <span class=\"kbd\">F4</span> to show or hide this panel.<br>Click a table while holding <span class=\"kbd\">Cmd/Ctrl</span> to insert its name. Click a column to insert <code>table.column</code>.<br><br><strong>Autocomplete:</strong> table and column suggestions follow the active SQL context. <span class=\"kbd\">Ctrl/Cmd+Space</span> opens suggestions when the context is valid.<br><br><strong>Execution:</strong> long queries run in a worker so the interface remains responsive. Cancel stops the worker.<br><br><strong>Results:</strong> use Shift+click for multi-column sorting, drag column edges to resize, and Ctrl/Cmd+click to freeze columns.<br><br><strong>Local backup:</strong> settings and saved workspace data stay only in this browser. Periodically export a JSON backup from Settings to avoid loss or continue in another browser. It may contain SQL; review it before sharing.", "Use <span class=\"kbd\">F4</span> para mostrar ou ocultar este painel.<br>Clique em uma tabela com <span class=\"kbd\">Cmd/Ctrl</span> para inserir o nome. Clique em uma coluna para inserir <code>tabela.coluna</code>.<br><br><strong>Autocompletar:</strong> as sugestões de tabelas e colunas seguem o contexto SQL ativo. <span class=\"kbd\">Ctrl/Cmd+Espaço</span> abre as sugestões quando o contexto é válido.<br><br><strong>Execução:</strong> consultas longas rodam em um worker para manter a interface responsiva. Cancelar encerra o worker.<br><br><strong>Resultados:</strong> use Shift+clique para ordenar por várias colunas, arraste as bordas para redimensionar e use Ctrl/Cmd+clique para congelar colunas.<br><br><strong>Backup local:</strong> as configurações e os dados salvos da área de trabalho ficam apenas neste navegador. Exporte periodicamente um backup JSON em Configurações para evitar perdas ou continuar em outro navegador. Ele pode conter SQL; revise-o antes de compartilhar.", "Use <span class=\"kbd\">F4</span> para mostrar u ocultar este panel.<br>Haga clic en una tabla con <span class=\"kbd\">Cmd/Ctrl</span> para insertar su nombre. Haga clic en una columna para insertar <code>tabla.columna</code>.<br><br><strong>Autocompletar:</strong> las sugerencias de tablas y columnas siguen el contexto SQL activo. <span class=\"kbd\">Ctrl/Cmd+Espacio</span> abre las sugerencias cuando el contexto es válido.<br><br><strong>Ejecución:</strong> las consultas largas se ejecutan en un worker para mantener la interfaz receptiva. Cancelar detiene el worker.<br><br><strong>Resultados:</strong> use Mayús+clic para ordenar por varias columnas, arrastre los bordes para cambiar el tamaño y use Ctrl/Cmd+clic para inmovilizar columnas.<br><br><strong>Copia local:</strong> la configuración y los datos guardados del área de trabajo permanecen solo en este navegador. Exporte periódicamente una copia JSON desde Configuración para evitar pérdidas o continuar en otro navegador. Puede contener SQL; revísela antes de compartirla."]
  , ["sqlMap.description", "Interactive ER diagram with SELECT and JOIN generation from declared foreign keys and session virtual relationships.", "DER interativo com geração de SELECT e JOINs a partir de FKs declaradas e relacionamentos virtuais da sessão.", "Diagrama ER interactivo con generación de SELECT y JOIN a partir de claves foráneas declaradas y relaciones virtuales de la sesión."]
  , ["sqlMap.selection", "Selection", "Seleção", "Selección"]
  , ["sqlMap.virtualHint", "Drag one field onto another to create a virtual relationship. Hover over a dotted line to inspect its technical details.", "Arraste um campo sobre outro para criar um relacionamento virtual. Passe o mouse sobre a linha pontilhada para ver os detalhes técnicos.", "Arrastre un campo sobre otro para crear una relación virtual. Pase el puntero sobre una línea de puntos para ver sus detalles técnicos."]
  , ["sqlMap.blockedHintHtml", "Tables without a declared or virtual relationship path are unavailable while a selection is active.<br>Declared relationships come from <code>pragma foreign_key_list</code>; virtual relationships last only for this session.", "Tabelas sem caminho por relacionamento declarado ou virtual ficam indisponíveis enquanto há uma seleção ativa.<br>Relacionamentos declarados vêm de <code>pragma foreign_key_list</code>; os virtuais valem apenas para esta sessão.", "Las tablas sin una ruta de relación declarada o virtual no están disponibles mientras haya una selección activa.<br>Las relaciones declaradas provienen de <code>pragma foreign_key_list</code>; las virtuales solo duran esta sesión."]
  , ["sqlMap.reviewDirection", "Review the direction, types, and risks before creating the relationship.", "Revise a direção, os tipos e os riscos antes de criar o relacionamento.", "Revise la dirección, los tipos y los riesgos antes de crear la relación."]
  , ["sqlMap.directionExplanation", "Direction determines which column acts as the foreign-key source and which column is referenced.", "A direção define qual coluna funciona como FK de origem e qual coluna é referenciada.", "La dirección determina qué columna actúa como origen de la clave foránea y qué columna es la referenciada."]
  , ["sqlMap.directionHelp", "Understand foreign-key direction", "Entender a direção da FK", "Entender la dirección de la clave foránea"]
  , ["sqlMap.invertDirection", "Invert direction", "Inverter direção", "Invertir dirección"]
  , ["population.description", "Configure synthetic data for local quality, load, and performance testing.", "Configure dados sintéticos para testes locais de qualidade, carga e desempenho.", "Configure datos sintéticos para pruebas locales de calidad, carga y rendimiento."]
  , ["population.memoryNoteHtml", "This operation changes the current in-memory database. Use <strong>Save .db</strong> to persist the result to a local file.", "Esta operação altera o banco atual em memória. Use <strong>Salvar .db</strong> para persistir o resultado no arquivo local.", "Esta operación modifica la base de datos actual en memoria. Use <strong>Guardar .db</strong> para conservar el resultado en un archivo local."]
  , ["population.strategiesLabel", "Strategies by column", "Estratégias por coluna", "Estrategias por columna"]
  , ["population.largeConfirm", "I understand that generating more than 100,000 rows can consume significant memory and take several minutes.", "Entendo que gerar mais de 100.000 registros pode consumir muita memória e levar vários minutos.", "Entiendo que generar más de 100.000 filas puede consumir mucha memoria y tardar varios minutos."]
  , ["history.description", "Queries recently executed in this browser, including successful runs and errors.", "Consultas executadas recentemente neste navegador, incluindo sucessos e erros.", "Consultas ejecutadas recientemente en este navegador, incluidos resultados correctos y errores."]
  , ["history.search", "Search history...", "Pesquisar no histórico...", "Buscar en el historial..."]
  , ["history.searchLabel", "Search query history", "Pesquisar no histórico de consultas", "Buscar en el historial de consultas"]
  , ["history.clear", "Clear history", "Limpar histórico", "Borrar historial"]
  , ["settings.sessionScope", "Session and SQL tabs", "Sessão e abas SQL", "Sesión y pestañas SQL"]
  , ["settings.importConfirmTitle", "Confirm import", "Confirmar importação", "Confirmar importación"]
  , ["settings.importConfirmDescription", "The selected current settings will be replaced by the imported values.", "As configurações atuais selecionadas serão substituídas pelos valores importados.", "La configuración actual seleccionada será reemplazada por los valores importados."]
  , ["shortcuts.quickHistory", "Quick history", "Histórico rápido", "Historial rápido"]
  , ["help.title", "hSQLite Editor help", "Ajuda do hSQLite Editor", "Ayuda de hSQLite Editor"]
  , ["help.intro", "A local-first SQLite analysis tool for support, teaching, and technical investigation.", "Uma ferramenta local-first para análise de SQLite em suporte, ensino e investigação técnica.", "Una herramienta local-first para analizar SQLite en soporte, docencia e investigación técnica."]
  , ["help.gridHtml", "<section><h4>1. Getting started</h4><div>Open a SQLite file, write SQL, and press <span class=\"kbd\">F5</span>.</div></section><section><h4>2. SQL workspace</h4><div>Use independent tabs, history, favorites, SQL files, and keyboard shortcuts.</div></section><section><h4>3. Schema</h4><div>Filter objects by name and type. Select columns to insert qualified identifiers.</div></section><section><h4>4. Results</h4><div>Sort, paginate, select, and export rows as CSV or JSON.</div></section><section><h4>5. Local data and backups</h4><div>Session data, history, favorites, and preferences are stored only in the current browser profile. Export them periodically from Settings to prevent loss. Import that JSON backup to continue in another browser. Clearing site data, using a private window, or changing browser profiles can make local data unavailable. Backups may contain SQL text, identifiers, history, favorites, and open-tab content; review them before sharing.</div></section><section><h4>6. Offline mode</h4><div>The official standalone HTML works directly from <code>file://</code>.</div></section><section><h4>7. Issues and suggestions</h4><div>Use Report a bug for reproducible defects. Suggest improvement opens the scoped GitHub Feature request form.</div></section>", "<section><h4>1. Primeiros passos</h4><div>Abra um arquivo SQLite, escreva SQL e pressione <span class=\"kbd\">F5</span>.</div></section><section><h4>2. Área SQL</h4><div>Use abas independentes, histórico, favoritas, arquivos SQL e atalhos de teclado.</div></section><section><h4>3. Schema</h4><div>Filtre objetos por nome e tipo. Selecione colunas para inserir identificadores qualificados.</div></section><section><h4>4. Resultados</h4><div>Ordene, pagine, selecione e exporte registros como CSV ou JSON.</div></section><section><h4>5. Dados locais e backups</h4><div>Dados da sessão, histórico, favoritas e preferências ficam armazenados apenas no perfil atual deste navegador. Exporte-os periodicamente em Configurações para evitar perdas. Importe esse backup JSON para continuar em outro navegador. Limpar os dados do site, usar uma janela privativa ou mudar de perfil pode tornar os dados locais indisponíveis. Backups podem conter textos SQL, identificadores, histórico, favoritas e conteúdo das abas abertas; revise-os antes de compartilhar.</div></section><section><h4>6. Modo offline</h4><div>O HTML standalone oficial funciona diretamente em <code>file://</code>.</div></section><section><h4>7. Problemas e sugestões</h4><div>Use Reportar erro para defeitos reproduzíveis. Sugerir melhoria abre o formulário específico Feature request do GitHub.</div></section>", "<section><h4>1. Primeros pasos</h4><div>Abra un archivo SQLite, escriba SQL y pulse <span class=\"kbd\">F5</span>.</div></section><section><h4>2. Área SQL</h4><div>Use pestañas independientes, historial, favoritas, archivos SQL y atajos de teclado.</div></section><section><h4>3. Esquema</h4><div>Filtre objetos por nombre y tipo. Seleccione columnas para insertar identificadores cualificados.</div></section><section><h4>4. Resultados</h4><div>Ordene, pagine, seleccione y exporte filas como CSV o JSON.</div></section><section><h4>5. Datos locales y copias de seguridad</h4><div>Los datos de la sesión, el historial, las favoritas y las preferencias se almacenan solo en el perfil actual de este navegador. Expórtelos periódicamente desde Configuración para evitar pérdidas. Importe esa copia JSON para continuar en otro navegador. Borrar los datos del sitio, usar una ventana privada o cambiar de perfil puede hacer que los datos locales no estén disponibles. Las copias pueden contener texto SQL, identificadores, historial, favoritas y contenido de las pestañas abiertas; revíselas antes de compartirlas.</div></section><section><h4>6. Modo sin conexión</h4><div>El HTML autónomo oficial funciona directamente desde <code>file://</code>.</div></section><section><h4>7. Problemas y sugerencias</h4><div>Use Informar de un error para defectos reproducibles. Sugerir una mejora abre el formulario específico Feature request de GitHub.</div></section>"]
  , ["offline.description", "This artifact is expected to work entirely offline. This screen means the file is incomplete or corrupted.", "Este artefato deve funcionar totalmente offline. Esta tela indica que o arquivo está incompleto ou corrompido.", "Este artefacto debe funcionar totalmente sin conexión. Esta pantalla indica que el archivo está incompleto o dañado."]
  , ["offline.guideHtml", "<strong>Expected:</strong> the standalone HTML contains every required resource.<br><br><strong>Verify:</strong><ul><li>Build the artifact again with the repository build command.</li><li>Replace old HTML copies with a fresh artifact from the same release.</li><li>If the file was modified manually, restore the official generated artifact.</li></ul>Then open the local file again.", "<strong>Esperado:</strong> o HTML standalone contém todos os recursos necessários.<br><br><strong>Verifique:</strong><ul><li>Gere o artefato novamente com o comando de build do repositório.</li><li>Substitua cópias antigas do HTML por um artefato novo do mesmo release.</li><li>Se o arquivo foi modificado manualmente, restaure o artefato oficial gerado.</li></ul>Depois abra o arquivo local novamente.", "<strong>Esperado:</strong> el HTML autónomo contiene todos los recursos necesarios.<br><br><strong>Compruebe:</strong><ul><li>Genere de nuevo el artefacto con el comando de compilación del repositorio.</li><li>Sustituya las copias antiguas del HTML por un artefacto nuevo de la misma versión.</li><li>Si el archivo se modificó manualmente, restaure el artefacto oficial generado.</li></ul>Después vuelva a abrir el archivo local."]
  , ["tabs.renameLabel", "Rename tab", "Renomear aba", "Renombrar pestaña"]
  , ["tabs.renameNamedLabel", "Rename tab {title}", "Renomear aba {title}", "Renombrar pestaña {title}"]
  , ["tabs.closeNamedLabel", "Close tab {title}", "Fechar aba {title}", "Cerrar pestaña {title}"]
  , ["tabs.limitReached", "The {count}-tab limit has been reached", "O limite de {count} abas foi atingido", "Se alcanzó el límite de {count} pestañas"]
  , ["tabs.newTitle", "New tab (Ctrl/Cmd+T)", "Nova aba (Ctrl/Cmd+T)", "Nueva pestaña (Ctrl/Cmd+T)"]
  , ["history.arrowsNavigate", "Up/Down navigates", "Cima/Baixo navega", "Arriba/Abajo navega"]
  , ["history.enterLoads", "Enter loads", "Enter carrega", "Intro carga"]
  , ["tabs.created", "New tab created: {title}", "Nova aba criada: {title}", "Nueva pestaña creada: {title}"]
  , ["tabs.keepOne", "Keep at least one tab open.", "Mantenha pelo menos uma aba aberta.", "Mantenga al menos una pestaña abierta."]
  , ["tabs.allClosed", "All tabs were closed. A new tab was created.", "Todas as abas foram fechadas. Uma nova aba foi criada.", "Se cerraron todas las pestañas. Se creó una nueva pestaña."]
  , ["results.emptyValue", "empty", "vazio", "vacío"]
  , ["database.creating", "Creating...", "Criando...", "Creando..."]
  , ["population.strategy.automatic", "Automatic", "Automático", "Automático"]
  , ["population.strategy.default", "Use default value", "Usar valor padrão", "Usar valor predeterminado"]
  , ["population.strategy.fixedNumber", "Fixed number", "Número fixo", "Número fijo"]
  , ["population.strategy.increment", "Increment", "Incremento", "Incremento"]
  , ["population.strategy.randomNumber", "Random range", "Faixa aleatória", "Intervalo aleatorio"]
  , ["population.strategy.fixedText", "Fixed text", "Texto fixo", "Texto fijo"]
  , ["population.strategy.randomText", "Random text", "Texto aleatório", "Texto aleatorio"]
  , ["population.strategy.lorem", "Lorem text", "Texto lorem", "Texto lorem"]
  , ["population.valueFor", "Value for {column}", "Valor para {column}", "Valor para {column}"]
  , ["population.textFor", "Text for {column}", "Texto para {column}", "Texto para {column}"]
  , ["population.start", "Start", "Início", "Inicio"]
  , ["population.step", "Step", "Passo", "Paso"]
  , ["population.minimum", "Minimum", "Mínimo", "Mínimo"]
  , ["population.maximum", "Maximum", "Máximo", "Máximo"]
  , ["population.characters", "Characters", "Caracteres", "Caracteres"]
  , ["population.words", "Words", "Palavras", "Palabras"]
  , ["population.strategy", "Strategy", "Estratégia", "Estrategia"]
  , ["population.noStrategy", "No strategy available", "Nenhuma estratégia disponível", "No hay ninguna estrategia disponible"]
  , ["population.noType", "no type", "sem tipo", "sin tipo"]
  , ["population.generated", "generated", "gerada", "generada"]
  , ["population.required", "required", "obrigatória", "obligatoria"]
  , ["population.optional", "optional", "opcional", "opcional"]
  , ["population.populating", "Populating...", "Populando...", "Poblando..."]
  , ["population.cancelExecution", "Cancel execution", "Cancelar execução", "Cancelar ejecución"]
  , ["population.invalidNumber", "{label} must be a valid number.", "{label} deve ser um número válido.", "{label} debe ser un número válido."]
  , ["population.tableUnavailable", "The selected table is no longer available in the schema.", "A tabela selecionada não está mais disponível no schema.", "La tabla seleccionada ya no está disponible en el esquema."]
  , ["population.invalidCount", "Enter a whole number from 1 to 1,000,000.", "Informe uma quantidade inteira entre 1 e 1.000.000.", "Introduzca un número entero entre 1 y 1.000.000."]
  , ["population.confirmLarge", "Confirm the impact of the large operation before continuing.", "Confirme o impacto da operação de grande volume antes de continuar.", "Confirme el impacto de la operación de gran volumen antes de continuar."]
  , ["population.strategyRequired", "Choose a strategy for this required column.", "Escolha uma estratégia para esta coluna obrigatória.", "Elija una estrategia para esta columna obligatoria."]
  , ["population.maxBelowMin", "Maximum must be greater than or equal to minimum.", "O máximo deve ser maior ou igual ao mínimo.", "El máximo debe ser mayor o igual que el mínimo."]
  , ["population.characterRange", "Use between 1 and {max} characters.", "Use entre 1 e {max} caracteres.", "Use entre 1 y {max} caracteres."]
  , ["population.wordRange", "Use between 1 and 40 words.", "Use entre 1 e 40 palavras.", "Use entre 1 y 40 palabras."]
  , ["population.starting", "Populating {table} with {count} row(s)...", "Populando {table} com {count} registro(s)...", "Poblando {table} con {count} fila(s)..."]
  , ["population.summary", "{count} row(s) inserted into {table} in {elapsed}.", "{count} registro(s) inserido(s) em {table} em {elapsed}.", "{count} fila(s) insertada(s) en {table} en {elapsed}."]
  , ["population.statusFailed", "Could not populate the table: {reason}", "Erro ao popular tabela: {reason}", "No se pudo poblar la tabla: {reason}"]
  , ["population.fixedValue", "Fixed value", "Valor fixo", "Valor fijo"]
  , ["worker.noValidSql", "No valid SQL statement was found.", "Nenhuma consulta SQL válida foi encontrada.", "No se encontró ninguna sentencia SQL válida."]
  , ["worker.noResultSet", "Statement completed without a result set.", "Consulta executada sem conjunto de resultados.", "Sentencia completada sin conjunto de resultados."]
  , ["worker.sqliteError", "SQLite error: {reason}", "Erro do SQLite: {reason}", "Error de SQLite: {reason}"]
  , ["worker.populationInvalidFixedNumber", "The fixed value for {name} must be a valid number.", "O valor fixo de {name} deve ser um número válido.", "El valor fijo de {name} debe ser un número válido."]
  , ["worker.populationInvalidIncrementStart", "The starting value for {name} must be a valid number.", "O valor inicial de {name} deve ser um número válido.", "El valor inicial de {name} debe ser un número válido."]
  , ["worker.populationInvalidIncrementStep", "The increment step for {name} must be a valid number.", "O passo de incremento de {name} deve ser um número válido.", "El paso de incremento de {name} debe ser un número válido."]
  , ["worker.populationInvalidMinimum", "The minimum value for {name} must be a valid number.", "O valor mínimo de {name} deve ser um número válido.", "El valor mínimo de {name} debe ser un número válido."]
  , ["worker.populationInvalidMaximum", "The maximum value for {name} must be a valid number.", "O valor máximo de {name} deve ser um número válido.", "El valor máximo de {name} debe ser un número válido."]
  , ["worker.populationTableMissing", "The selected table does not exist in the current schema.", "A tabela selecionada não existe no schema atual.", "La tabla seleccionada no existe en el esquema actual."]
  , ["worker.populationCountRange", "The row count must be between 1 and 1,000,000.", "A quantidade deve estar entre 1 e 1.000.000 de registros.", "La cantidad debe estar entre 1 y 1.000.000 de filas."]
  , ["worker.populationInvalidColumns", "The population plan contains invalid or duplicate columns.", "O plano de população contém colunas inválidas ou duplicadas.", "El plan de población contiene columnas no válidas o duplicadas."]
  , ["worker.populationColumnMissing", "Column {name} does not exist in the current schema.", "A coluna {name} não existe no schema atual.", "La columna {name} no existe en el esquema actual."]
  , ["worker.populationGeneratedColumn", "Generated column {name} must remain automatic.", "A coluna gerada {name} deve permanecer automática.", "La columna generada {name} debe permanecer automática."]
  , ["worker.populationColumnRange", "The maximum for {name} must be greater than or equal to its minimum.", "O máximo de {name} deve ser maior ou igual ao mínimo.", "El máximo de {name} debe ser mayor o igual que el mínimo."]
  , ["worker.populationStrategyUnsupported", "The strategy for column {name} is not supported.", "A estratégia da coluna {name} não é suportada.", "La estrategia de la columna {name} no es compatible."]
  , ["worker.validationSchemaFailed", "The data could not be validated against the current schema.", "Não foi possível validar os dados com o schema atual.", "No se pudieron validar los datos con el esquema actual."]
  , ["sqlMap.relationNotAllowed", "Relationship not allowed", "Relacionamento não permitido", "Relación no permitida"]
  , ["sqlMap.relationCreateFailed", "This virtual relationship could not be created.", "Não foi possível criar este relacionamento virtual.", "No se pudo crear esta relación virtual."]
  , ["sqlMap.incompatibleData", "Data is incompatible with this relationship", "Dados incompatíveis para este relacionamento", "Los datos son incompatibles con esta relación"]
  , ["sqlMap.orphansBlock", "Orphan rows prevent this virtual relationship from being created.", "Há registros órfãos impedindo a criação deste relacionamento virtual.", "Hay filas huérfanas que impiden crear esta relación virtual."]
  , ["sqlMap.orphanSource", "{count} distinct orphan value(s) on foreign-key source {source} have no match in {target}.", "{count} valor(es) órfão(s) distinto(s) na origem FK {source} não têm correspondência em {target}.", "{count} valor(es) huérfano(s) distinto(s) en el origen de clave foránea {source} no tienen coincidencia en {target}."]
  , ["sqlMap.orphanTarget", "{count} distinct orphan value(s) on referenced target {target} have no match in {source}.", "{count} valor(es) órfão(s) distinto(s) no destino referenciado {target} não têm correspondência em {source}.", "{count} valor(es) huérfano(s) distinto(s) en el destino referenciado {target} no tienen coincidencia en {source}."]
  , ["sqlMap.compatibilityUnknown", "Compatibility could not be fully validated", "A compatibilidade não pôde ser validada por completo", "No se pudo validar completamente la compatibilidad"]
  , ["sqlMap.unknownType", "At least one field has an unrecognized type.", "Pelo menos um dos campos não possui tipo reconhecido.", "Al menos uno de los campos tiene un tipo no reconocido."]
  , ["sqlMap.possibleIncorrectLink", "The SQL may work, but the relationship may hide an incorrect association.", "O SQL pode funcionar, mas o relacionamento pode mascarar um vínculo incorreto.", "El SQL puede funcionar, pero la relación puede ocultar una asociación incorrecta."]
  , ["sqlMap.reviewBusinessKey", "Check whether a more appropriate business key or identifier exists.", "Verifique se existe uma chave de negócio ou um identificador mais apropriado.", "Compruebe si existe una clave de negocio o un identificador más apropiado."]
  , ["sqlMap.incompatibleTypes", "Incompatible types", "Tipos incompatíveis", "Tipos incompatibles"]
  , ["sqlMap.textTypeRule", "Text fields can relate only to other text fields in this flow.", "Campos textuais só podem se relacionar com outros campos textuais neste fluxo.", "Los campos de texto solo pueden relacionarse con otros campos de texto en este flujo."]
  , ["sqlMap.blobTypeRule", "Binary fields can relate only to other binary fields in this flow.", "Campos binários só podem se relacionar com outros campos binários neste fluxo.", "Los campos binarios solo pueden relacionarse con otros campos binarios en este flujo."]
  , ["sqlMap.temporalWarning", "Suspicious temporal relationship", "Relacionamento temporal suspeito", "Relación temporal sospechosa"]
  , ["sqlMap.unusualRelationship", "The types are technically compatible, but this relationship is unusual.", "Os tipos são tecnicamente compatíveis, mas este relacionamento é incomum.", "Los tipos son técnicamente compatibles, pero esta relación es inusual."]
  , ["sqlMap.temporalRisk", "Relating temporal fields often produces fragile joins, unexpected cardinality, and low selectivity.", "Relacionar campos temporais costuma produzir joins frágeis, cardinalidade inesperada e baixa seletividade.", "Relacionar campos temporales suele producir uniones frágiles, cardinalidad inesperada y baja selectividad."]
  , ["sqlMap.temporalTypeRule", "Temporal fields can relate only to the same temporal subtype in this flow.", "Campos temporais só podem se relacionar com o mesmo subtipo temporal neste fluxo.", "Los campos temporales solo pueden relacionarse con el mismo subtipo temporal en este flujo."]
  , ["sqlMap.suspiciousCompatibility", "Technically possible but suspicious compatibility", "Compatibilidade tecnicamente possível, mas suspeita", "Compatibilidad técnicamente posible, pero sospechosa"]
  , ["sqlMap.booleanNumericRisk", "Boolean values and numeric codes may represent very different domains and produce incorrect joins.", "Valores booleanos e códigos numéricos podem representar domínios muito diferentes e produzir joins incorretos.", "Los valores booleanos y los códigos numéricos pueden representar dominios muy diferentes y producir uniones incorrectas."]
  , ["sqlMap.reviewBoolean", "Check whether the Boolean field is only an indicator and whether a better identifier exists.", "Verifique se o campo booleano é apenas um indicador e se existe um identificador melhor.", "Compruebe si el campo booleano es solo un indicador y si existe un identificador mejor."]
  , ["sqlMap.booleanTypeRule", "Boolean fields must not relate to text, binary, or temporal fields in this flow.", "Campos booleanos não devem se relacionar com texto, binário ou classes temporais neste fluxo.", "Los campos booleanos no deben relacionarse con texto, binarios o clases temporales en este flujo."]
  , ["sqlMap.declaredTypesRule", "The declared types are not compatible with this virtual relationship.", "Os tipos declarados não são compatíveis com este relacionamento virtual.", "Los tipos declarados no son compatibles con esta relación virtual."]
  , ["sqlMap.sameColumn", "A column cannot relate to itself.", "Uma coluna não pode se relacionar com ela mesma.", "Una columna no puede relacionarse consigo misma."]
  , ["sqlMap.sameTable", "Virtual relationships between columns in the same table are not supported.", "Relacionamentos virtuais entre colunas da mesma tabela não são suportados.", "No se admiten relaciones virtuales entre columnas de la misma tabla."]
  , ["sqlMap.columnMissing", "One of the selected columns could not be found in the current schema.", "Uma das colunas selecionadas não foi encontrada no schema atual.", "No se encontró una de las columnas seleccionadas en el esquema actual."]
  , ["sqlMap.relationExists", "Relationship already exists", "O relacionamento já existe", "La relación ya existe"]
  , ["sqlMap.relationConflict", "A declared or virtual relationship already exists between these columns.", "Já existe um relacionamento declarado ou virtual entre essas colunas.", "Ya existe una relación declarada o virtual entre estas columnas."]
  , ["sqlMap.declaredFk", "Declared foreign key", "FK declarada", "Clave foránea declarada"]
  , ["sqlMap.suspicious", "Suspicious compatibility", "Compatibilidade suspeita", "Compatibilidad sospechosa"]
  , ["sqlMap.virtualSummary", "{count} virtual relationship(s) active in this session.{warnings} Hover over a dotted line to inspect direction, types, or remove it.", "{count} relacionamento(s) virtual(is) ativo(s) nesta sessão.{warnings} Passe o mouse sobre uma linha pontilhada para ver direção, tipos ou removê-la.", "{count} relación(es) virtual(es) activa(s) en esta sesión.{warnings} Pase el puntero sobre una línea de puntos para ver la dirección, los tipos o eliminarla."]
  , ["sqlMap.warningCount", " {count} have a compatibility warning.", " {count} têm aviso de compatibilidade.", " {count} tienen una advertencia de compatibilidad."]
  , ["editor.runtimeFallback", "The rich editor runtime is unavailable. The plain-text editor is active.", "O editor avançado não está disponível. O editor de texto simples está ativo.", "El editor avanzado no está disponible. El editor de texto sencillo está activo."]
  , ["status.elapsed", "Elapsed: {elapsed}", "Tempo decorrido: {elapsed}", "Tiempo transcurrido: {elapsed}"]
  , ["sqlError.failed", "The SQL statement failed.", "A instrução SQL falhou.", "La sentencia SQL falló."]
  , ["sqlError.likelyCause", "Likely cause: {cause}.", "Causa provável: {cause}.", "Causa probable: {cause}."]
  , ["sqlError.suggestedSolution", "Suggested action: {solution}", "Ação sugerida: {solution}", "Acción sugerida: {solution}"]
  , ["sqlError.previousResults", "The results below were not updated and may still show the previous query.", "Os resultados abaixo não foram atualizados e podem mostrar a consulta anterior.", "Los resultados siguientes no se actualizaron y pueden mostrar la consulta anterior."]
  , ["sqlError.engineLabel", "SQLite returned:", "O SQLite retornou:", "SQLite devolvió:"]
  , ["sqlError.unknown", "Unknown error.", "Erro desconhecido.", "Error desconocido."]
  , ["sqlError.missingTable.cause", "a table or view name was not found", "uma tabela ou view não foi encontrada", "no se encontró una tabla o vista"]
  , ["sqlError.missingTable.solution", "Check the name in Schema and confirm that the correct database is open.", "Verifique o nome no Schema e confirme que o banco correto está aberto.", "Compruebe el nombre en Esquema y confirme que está abierta la base de datos correcta."]
  , ["sqlError.missingColumn.cause", "a column is missing or ambiguous", "uma coluna não existe ou é ambígua", "una columna no existe o es ambigua"]
  , ["sqlError.missingColumn.solution", "Check the spelling and qualify the column with its table or alias.", "Verifique a grafia e qualifique a coluna com a tabela ou o alias.", "Compruebe la ortografía y cualifique la columna con su tabla o alias."]
  , ["sqlError.syntax.cause", "the SQL syntax is incomplete or invalid", "a sintaxe SQL está incompleta ou inválida", "la sintaxis SQL está incompleta o no es válida"]
  , ["sqlError.syntax.solution", "Review keywords, commas, parentheses, quotes, and clause order.", "Revise palavras-chave, vírgulas, parênteses, aspas e a ordem das cláusulas.", "Revise palabras clave, comas, paréntesis, comillas y el orden de las cláusulas."]
  , ["sqlError.function.cause", "a function or aggregate is being used incorrectly", "uma função ou agregação está sendo usada incorretamente", "una función o agregación se está usando de forma incorrecta"]
  , ["sqlError.function.solution", "Check the SQLite function signature and use GROUP BY or HAVING where required.", "Verifique a assinatura da função no SQLite e use GROUP BY ou HAVING quando necessário.", "Compruebe la firma de la función en SQLite y use GROUP BY o HAVING cuando sea necesario."]
  , ["sqlError.unique.cause", "a unique or primary-key value already exists", "um valor único ou de chave primária já existe", "ya existe un valor único o de clave primaria"]
  , ["sqlError.unique.solution", "Use a different key or update the existing row.", "Use outra chave ou atualize o registro existente.", "Use otra clave o actualice la fila existente."]
  , ["sqlError.required.cause", "a required column has no value", "uma coluna obrigatória está sem valor", "una columna obligatoria no tiene valor"]
  , ["sqlError.required.solution", "Provide a value for every NOT NULL column.", "Informe um valor para cada coluna NOT NULL.", "Proporcione un valor para cada columna NOT NULL."]
  , ["sqlError.foreignKey.cause", "a foreign-key reference is invalid", "uma referência de chave estrangeira é inválida", "una referencia de clave foránea no es válida"]
  , ["sqlError.foreignKey.solution", "Create the parent row first or use an existing referenced key.", "Crie primeiro o registro pai ou use uma chave referenciada existente.", "Cree primero la fila padre o use una clave referenciada existente."]
  , ["sqlError.constraint.cause", "a value violates a schema constraint", "um valor viola uma restrição do schema", "un valor infringe una restricción del esquema"]
  , ["sqlError.constraint.solution", "Review data types, CHECK constraints, and inserted values.", "Revise tipos, restrições CHECK e os valores inseridos.", "Revise tipos, restricciones CHECK y los valores insertados."]
  , ["sqlError.locked.cause", "the database is busy or locked", "o banco está ocupado ou bloqueado", "la base de datos está ocupada o bloqueada"]
  , ["sqlError.locked.solution", "Wait for the current operation and close other processes using the file.", "Aguarde a operação atual e feche outros processos que usam o arquivo.", "Espere a la operación actual y cierre otros procesos que usen el archivo."]
  , ["sqlError.readonly.cause", "the database is read-only", "o banco está somente para leitura", "la base de datos es de solo lectura"]
  , ["sqlError.readonly.solution", "Save a writable copy or review browser file permissions.", "Salve uma cópia gravável ou revise as permissões do arquivo no navegador.", "Guarde una copia editable o revise los permisos del archivo en el navegador."]
  , ["sqlError.invalidDatabase.cause", "the file is invalid or corrupted", "o arquivo é inválido ou está corrompido", "el archivo no es válido o está dañado"]
  , ["sqlError.invalidDatabase.solution", "Open a known-good SQLite copy and verify the source file.", "Abra uma cópia SQLite íntegra e verifique o arquivo de origem.", "Abra una copia SQLite válida y compruebe el archivo de origen."]
  , ["sqlError.duplicate.cause", "a schema object already exists", "um objeto do schema já existe", "ya existe un objeto del esquema"]
  , ["sqlError.duplicate.solution", "Use IF NOT EXISTS, choose another name, or remove the existing object first.", "Use IF NOT EXISTS, escolha outro nome ou remova antes o objeto existente.", "Use IF NOT EXISTS, elija otro nombre o elimine primero el objeto existente."]
  , ["common.unavailable", "unavailable", "indisponível", "no disponible"]
  , ["common.attention", "Attention", "Atenção", "Atención"]
  , ["sqlMap.review", "Review", "Revisar", "Revisar"]
  , ["sqlMap.blocked", "Blocked", "Bloqueado", "Bloqueado"]
  , ["sqlMap.source", "Source", "Origem", "Origen"]
  , ["sqlMap.createFrom", "Create a virtual relationship from {field}", "Criar relacionamento virtual a partir de {field}", "Crear una relación virtual desde {field}"]
  , ["sqlMap.selectTable", "Select table {table}", "Selecionar tabela {table}", "Seleccionar tabla {table}"]
  , ["sqlMap.selectField", "Select field {field} in table {table}", "Selecionar campo {field} da tabela {table}", "Seleccionar campo {field} de la tabla {table}"]
  , ["sqlMap.dragOrEnter", "Drag or press Enter to create a virtual relationship", "Arraste ou pressione Enter para criar um relacionamento virtual", "Arrastre o pulse Intro para crear una relación virtual"]
  , ["sqlMap.virtualRelationship", "Virtual relationship", "Relacionamento virtual", "Relación virtual"]
  , ["sqlMap.edgeLabel", "{kind} from {source} to {target}", "{kind} de {source} para {target}", "{kind} de {source} a {target}"]
  , ["sqlMap.orphanCounts", "Distinct orphans at FK source: {source}; at referenced target: {target}", "Órfãos distintos na origem FK: {source}; no destino referenciado: {target}", "Huérfanos distintos en el origen FK: {source}; en el destino referenciado: {target}"]
  , ["sqlMap.reviewRelationship", "Review the virtual relationship.", "Revise o relacionamento virtual.", "Revise la relación virtual."]
  , ["sqlMap.validationFailed", "The relationship could not be validated", "Não foi possível validar o relacionamento", "No se pudo validar la relación"]
  , ["sqlMap.validationSchemaFailed", "The relationship could not be validated against the current schema.", "Não foi possível validar o relacionamento com o schema atual.", "No se pudo validar la relación con el esquema actual."]
  , ["sqlMap.validationRequiresDatabase", "Open a valid database before validating virtual relationships.", "Abra um banco válido antes de validar relacionamentos virtuais.", "Abra una base de datos válida antes de validar relaciones virtuales."]
  , ["sqlMap.validationUnknown", "Unknown virtual-relationship validation error.", "Erro desconhecido ao validar o relacionamento virtual.", "Error desconocido al validar la relación virtual."]
  , ["sqlMap.validationDataFailed", "Could not validate relationship data.", "Não foi possível validar os dados do relacionamento.", "No se pudieron validar los datos de la relación."]
  , ["sqlMap.replaceDiagnosticConfirm", "The active tab already contains SQL. Continue and replace it with the diagnostic SQL?", "A aba ativa já contém SQL. Deseja substituí-lo pelo SQL de diagnóstico?", "La pestaña activa ya contiene SQL. ¿Desea reemplazarlo por el SQL de diagnóstico?"]
  , ["sqlMap.replaceGeneratedConfirm", "The active tab already contains SQL. Continue and replace it with the generated query?", "A aba ativa já contém SQL. Deseja substituí-lo pela consulta gerada?", "La pestaña activa ya contiene SQL. ¿Desea reemplazarlo por la consulta generada?"]
  , ["sqlMap.validatingInverted", "Validating inverted relationship...", "Validando relacionamento invertido...", "Validando la relación invertida..."]
  , ["sqlMap.relating", "Relating {source} to {target}...", "Relacionando {source} com {target}...", "Relacionando {source} con {target}..."]
  , ["sqlMap.validatingData", "Validating data compatibility...", "Validando compatibilidade dos dados...", "Validando la compatibilidad de los datos..."]
  , ["sqlMap.noPath", "No declared or virtual relationship path reaches {table}.", "Nenhum caminho de relacionamento declarado ou virtual alcança {table}.", "Ninguna ruta de relación declarada o virtual llega a {table}."]
  , ["clipboard.writeDenied", "The browser could not write to the clipboard.", "O navegador não pôde gravar na área de transferência.", "El navegador no pudo escribir en el portapapeles."]
  , ["clipboard.readDenied", "The browser could not read the clipboard in this context. Paste manually or use a secure localhost context.", "O navegador não pôde ler a área de transferência neste contexto. Cole manualmente ou use um contexto seguro em localhost.", "El navegador no pudo leer el portapapeles en este contexto. Pegue manualmente o use un contexto seguro en localhost."]
  , ["clipboard.pasteFailed", "Could not paste from the clipboard: {reason}", "Não foi possível colar da área de transferência: {reason}", "No se pudo pegar desde el portapapeles: {reason}"]
  , ["clipboard.pasteFailedTitle", "Paste failed", "Falha ao colar", "Error al pegar"]
  , ["runtime.sqlJsInitFailed", "The embedded sql.js runtime could not start.", "Não foi possível iniciar o runtime sql.js embutido.", "No se pudo iniciar el entorno sql.js integrado."]
  , ["runtime.wasmMissing", "The artifact does not contain the embedded sql.js WebAssembly binary.", "O artefato não contém o binário WebAssembly embutido do sql.js.", "El artefacto no contiene el binario WebAssembly integrado de sql.js."]
  , ["runtime.sqlJsUnavailable", "The SQL runtime is unavailable for restoring the active connection.", "O runtime SQL não está disponível para restaurar a conexão ativa.", "El entorno SQL no está disponible para restaurar la conexión activa."]
  , ["database.invalidExtension", "{name} is not an allowed SQLite file. Use one of: {extensions}.", "{name} não tem uma extensão SQLite permitida. Use uma destas: {extensions}.", "{name} no tiene una extensión SQLite permitida. Use una de estas: {extensions}."]
  , ["database.invalidFile", "The selected file does not appear to be a valid SQLite database.", "O arquivo selecionado não parece ser um banco SQLite válido.", "El archivo seleccionado no parece ser una base de datos SQLite válida."]
  , ["database.invalidFileDetected", "The selected file does not appear to be SQLite. Detected type: {type}.", "O arquivo selecionado não parece ser SQLite. Tipo detectado: {type}.", "El archivo seleccionado no parece ser SQLite. Tipo detectado: {type}."]
  , ["database.unsavedChanges", "Database file - unsaved changes", "Arquivo de dados - alterações não salvas", "Archivo de base de datos: cambios sin guardar"]
  , ["database.saveUnsaved", "Save current database (.db) - unsaved changes", "Salvar o banco atual (.db) - alterações não salvas", "Guardar la base de datos actual (.db): cambios sin guardar"]
  , ["database.originUnavailable", "File origin unavailable in this browser", "Origem do arquivo indisponível neste navegador", "Origen del archivo no disponible en este navegador"]
  , ["common.notProvided", "not provided", "não informado", "no indicado"]
  , ["common.unidentified", "unidentified", "não identificado", "sin identificar"]
  , ["grid.metaTable", "Table/View: {value}", "Tabela/View: {value}", "Tabla/Vista: {value}"]
  , ["grid.metaColumn", "Column: {value}", "Coluna: {value}", "Columna: {value}"]
  , ["grid.metaType", "Type: {value}", "Tipo: {value}", "Tipo: {value}"]
  , ["grid.metaPk", "Primary key: {value}", "Chave primária: {value}", "Clave primaria: {value}"]
  , ["grid.metaNotNull", "NOT NULL: {value}", "NOT NULL: {value}", "NOT NULL: {value}"]
  , ["grid.columnsFrozen", "Columns 1 through {count} frozen.", "Colunas 1 até {count} congeladas.", "Columnas 1 a {count} inmovilizadas."]
  , ["grid.columnsUnfrozen", "Columns unfrozen.", "Colunas descongeladas.", "Columnas liberadas."]
  , ["grid.columnMoved", "Column moved: {column}", "Coluna movida: {column}", "Columna movida: {column}"]
  , ["grid.freezeHint", "Ctrl/Cmd+click freezes columns from the first through this one.", "Ctrl/Cmd+clique congela as colunas da primeira até esta.", "Ctrl/Cmd+clic inmoviliza las columnas desde la primera hasta esta."]
  , ["grid.columnHint", "Click to sort. Shift+click adds an ORDER BY criterion. Ctrl/Cmd+click freezes columns through this one.", "Clique para ordenar. Shift+clique adiciona um critério ORDER BY. Ctrl/Cmd+clique congela as colunas até esta.", "Haga clic para ordenar. Mayús+clic añade un criterio ORDER BY. Ctrl/Cmd+clic inmoviliza las columnas hasta esta."]
  , ["results.resultNumber", "Result {number}", "Resultado {number}", "Resultado {number}"]
  , ["results.rowCount", "{count} row(s)", "{count} registro(s)", "{count} fila(s)"]
  , ["results.recordCountOne", "1 row", "1 registro", "1 fila"]
  , ["results.recordCountMany", "{count} rows", "{count} registros", "{count} filas"]
  , ["editor.autocompleteLabel", "SQL autocomplete suggestions", "Sugestões de preenchimento automático SQL", "Sugerencias de autocompletado SQL"]
  , ["results.pageNumber", "Page {page}/{pages}", "Página {page}/{pages}", "Página {page}/{pages}"]
  , ["results.emptyAfterFilter", "No results match the filter.", "Nenhum resultado corresponde ao filtro.", "Ningún resultado coincide con el filtro."]
  , ["release.typeFeature", "Feature", "Novidade", "Novedad"]
  , ["release.typeFix", "Fix", "Correção", "Corrección"]
  , ["release.typeChore", "Maintenance", "Manutenção", "Mantenimiento"]
  , ["release.typeDocs", "Documentation", "Documentação", "Documentación"]
  , ["release.typeRefactor", "Refactor", "Refatoração", "Refactorización"]
  , ["release.typePerformance", "Performance", "Desempenho", "Rendimiento"]
  , ["release.typeAutomation", "Automation", "Automação", "Automatización"]
  , ["release.typeTest", "Test", "Teste", "Prueba"]
  , ["release.typeUpdate", "Update", "Atualização", "Actualización"]
  , ["release.updatedTo", "The editor was updated to version {version}.", "O editor foi atualizado para a versão {version}.", "El editor se actualizó a la versión {version}."]
  , ["release.updatedFrom", "The editor was updated from {from} to {to}.", "O editor foi atualizado da versão {from} para {to}.", "El editor se actualizó de la versión {from} a la {to}."]
  , ["database.schemaExportHeader", "hSQLite Editor - database structure (no data)", "hSQLite Editor - estrutura do banco (sem dados)", "hSQLite Editor: estructura de la base de datos (sin datos)"]
  , ["database.schemaExportSource", "Source database: {name}", "Banco de origem: {name}", "Base de datos de origen: {name}"]
  , ["database.schemaExportGenerated", "Generated at: {date}", "Gerado em: {date}", "Generado el: {date}"]
  , ["database.schemaExportEmpty", "There are no schema objects to export.", "Não há objetos de schema para exportar.", "No hay objetos de esquema para exportar."]
  , ["database.schemaExported", "Schema exported to {name}.", "Estrutura exportada para {name}.", "Esquema exportado a {name}."]
  , ["database.schemaExportFailed", "Could not export the schema: {reason}", "Não foi possível exportar a estrutura: {reason}", "No se pudo exportar el esquema: {reason}"]
  , ["database.generatedOrigin", "Database created in memory by the editor", "Banco criado em memória pelo editor", "Base de datos creada en memoria por el editor"]
  , ["tabs.fallback", "Tab {number}", "Aba {number}", "Pestaña {number}"]
  , ["file.description", "File", "Arquivo", "Archivo"]
  , ["file.dropEmpty", "No file was found in the drop operation.", "Nenhum arquivo foi encontrado ao soltar.", "No se encontró ningún archivo al soltar."]
  , ["recent.file", "Recent file", "Arquivo recente", "Archivo reciente"]
  , ["database.openFailed", "Could not open SQLite: {reason}", "Não foi possível abrir o SQLite: {reason}", "No se pudo abrir SQLite: {reason}"]
  , ["clipboard.copyFailed", "Could not copy the query: {reason}", "Não foi possível copiar a consulta: {reason}", "No se pudo copiar la consulta: {reason}"]
  , ["clipboard.copyFailedTitle", "Copy failed", "Falha ao copiar", "Error al copiar"]
  , ["common.none", "none", "nenhum", "ninguno"]
  , ["common.remove", "Remove", "Remover", "Eliminar"]
  , ["theme.toggleTitle", "Toggle light or dark theme (Shift+F2)", "Alternar tema claro ou escuro (Shift+F2)", "Alternar tema claro u oscuro (Mayús+F2)"]
  , ["tabs.more", "More tabs", "Mais abas", "Más pestañas"]
  , ["tabs.closeTitle", "Close tab?", "Fechar aba?", "¿Cerrar pestaña?"]
  , ["tabs.unsavedCloseGeneric", "The edited query will be lost when this tab closes.", "A consulta em edição será perdida ao fechar esta aba.", "La consulta editada se perderá al cerrar esta pestaña."]
  , ["tabs.close", "Close tab", "Fechar aba", "Cerrar pestaña"]
  , ["tabs.renaming", "Renaming {title}", "Renomeando {title}", "Cambiando el nombre de {title}"]
  , ["schema.clearFilter", "Clear schema filter", "Limpar filtro do schema", "Borrar filtro del esquema"]
  , ["schema.otherCount", "Other ({count})", "Outros ({count})", "Otros ({count})"]
  , ["schema.insertObject", "Ctrl/Cmd+click to insert the object name", "Ctrl/Cmd+clique para inserir o nome do objeto", "Ctrl/Cmd+clic para insertar el nombre del objeto"]
  , ["schema.insertField", "Insert {table}.{field}", "Inserir {table}.{field}", "Insertar {table}.{field}"]
  , ["editor.openSqlTitle", "Open a .sql or .txt file in the editor (Ctrl/Cmd+O)", "Abrir arquivo .sql ou .txt no editor (Ctrl/Cmd+O)", "Abrir un archivo .sql o .txt en el editor (Ctrl/Cmd+O)"]
  , ["editor.saveSqlTitle", "Save the current query as a .sql file (Ctrl/Cmd+S)", "Salvar a consulta atual em arquivo .sql (Ctrl/Cmd+S)", "Guardar la consulta actual como archivo .sql (Ctrl/Cmd+S)"]
  , ["editor.openRunTitle", "Open a .sql or .txt file and then run it (Ctrl/Cmd+Shift+O)", "Abrir arquivo .sql ou .txt e executar em seguida (Ctrl/Cmd+Shift+O)", "Abrir un archivo .sql o .txt y ejecutarlo (Ctrl/Cmd+Mayús+O)"]
  , ["editor.clearTitle", "Clear the SQL editor (F7)", "Limpar o editor SQL (F7)", "Borrar el editor SQL (F7)"]
  , ["editor.closeAllTitle", "Close all SQL tabs and open a new one", "Fechar todas as abas SQL e abrir uma nova", "Cerrar todas las pestañas SQL y abrir una nueva"]
  , ["editor.exportSchemaTitle", "Export the database structure script without data", "Exportar o script da estrutura do banco sem dados", "Exportar el script de estructura de la base de datos sin datos"]
  , ["editor.shortcutsTitle", "View primary keyboard shortcuts", "Ver os principais atalhos de teclado", "Ver los principales atajos de teclado"]
  , ["editor.sqlMapTitle", "Open the interactive SQL Map / ER diagram", "Abrir o Mapa SQL / DER interativo", "Abrir el Mapa SQL / diagrama ER interactivo"]
  , ["editor.resizeTitle", "Drag to resize the SQL editor height", "Arraste para ajustar a altura do editor SQL", "Arrastre para ajustar la altura del editor SQL"]
  , ["editor.findPrevious", "Previous occurrence", "Ocorrência anterior", "Coincidencia anterior"]
  , ["editor.findPlaceholder", "Find...", "Localizar...", "Buscar..."]
  , ["editor.replacePlaceholder", "Replace with...", "Substituir por...", "Reemplazar por..."]
  , ["editor.replaceHide", "Hide replace", "Ocultar substituir", "Ocultar reemplazo"]
  , ["status.elapsedInitial", "Elapsed: 0s", "Tempo decorrido: 0s", "Tiempo transcurrido: 0s"]
  , ["results.exportCsvTitle", "Export results as CSV (F9)", "Exportar resultados em CSV (F9)", "Exportar resultados como CSV (F9)"]
  , ["results.exportJsonTitle", "Export results as JSON (F10)", "Exportar resultados em JSON (F10)", "Exportar resultados como JSON (F10)"]
  , ["results.horizontalScroll", "Horizontal results-table scroll", "Rolagem horizontal da tabela de resultados", "Desplazamiento horizontal de la tabla de resultados"]
  , ["sqlMap.search", "Search for a table or field in SQL Map", "Buscar tabela ou campo no Mapa SQL", "Buscar una tabla o un campo en el Mapa SQL"]
  , ["sqlMap.searchPlaceholder", "Search table/field...", "Buscar tabela/campo...", "Buscar tabla/campo..."]
  , ["sqlMap.autoLayout", "Reorganize", "Reorganizar", "Reorganizar"]
  , ["sqlMap.exportPng", "Export PNG", "Exportar PNG", "Exportar PNG"]
  , ["sqlMap.generatedSql", "Generated SQL", "SQL gerado", "SQL generado"]
  , ["sqlMap.paste", "Paste into editor", "Colar no editor", "Pegar en el editor"]
  , ["sqlMap.clearPaste", "Clear and paste into editor", "Limpar e colar no editor", "Borrar y pegar en el editor"]
  , ["sqlMap.virtualRelationships", "Virtual relationships", "Relacionamentos virtuais", "Relaciones virtuales"]
  , ["sqlMap.clearVirtual", "Clear virtual relationships", "Limpar relacionamentos virtuais", "Borrar relaciones virtuales"]
  , ["sqlMap.confirmTitle", "Confirm virtual relationship", "Confirmar relacionamento virtual", "Confirmar relación virtual"]
  , ["sqlMap.fkSource", "FK source", "Origem da FK", "Origen de la clave foránea"]
  , ["sqlMap.referencedTarget", "Referenced target", "Destino referenciado", "Destino referenciado"]
  , ["sqlMap.declaredTypes", "Declared types", "Tipos declarados", "Tipos declarados"]
  , ["sqlMap.edgeTypes", "Types: {source} to {target}", "Tipos: {source} para {target}", "Tipos: {source} a {target}"]
  , ["sqlMap.acknowledgeRisk", "I understand the risks and still want to create this virtual relationship.", "Entendo os riscos e ainda assim quero criar este relacionamento virtual.", "Entiendo los riesgos y aun así quiero crear esta relación virtual."]
  , ["sqlMap.copyDiagnostic", "Copy SQL", "Copiar SQL", "Copiar SQL"]
  , ["sqlMap.openDiagnostic", "Open in editor", "Abrir no editor", "Abrir en el editor"]
  , ["sqlMap.create", "Create relationship", "Criar relacionamento", "Crear relación"]
  , ["population.title", "Populate table for QA", "Popular tabela para QA", "Poblar tabla para QA"]
  , ["population.recordCount", "Record count", "Quantidade de registros", "Cantidad de registros"]
  , ["population.run", "Populate table", "Popular tabela", "Poblar tabla"]
  , ["history.clearSearch", "Clear history search", "Limpar pesquisa do histórico", "Borrar búsqueda del historial"]
  , ["recent.clear", "Clear recent databases", "Limpar bancos recentes", "Borrar bases de datos recientes"]
  , ["favorites.clear", "Clear favorites", "Limpar favoritas", "Borrar favoritas"]
  , ["settings.transferDescription", "Backup and transfer between browsers: to import, select the exported JSON file.", "Backup e transferência entre navegadores: para importar, selecione o arquivo JSON exportado.", "Copia de seguridad y transferencia entre navegadores: para importar, seleccione el archivo JSON exportado."]
  , ["shortcuts.title", "Primary keyboard shortcuts", "Atalhos principais", "Atajos principales"]
  , ["shortcuts.openDatabase", "Open SQLite database", "Abrir banco SQLite", "Abrir base de datos SQLite"]
  , ["shortcuts.toggleSchema", "Show/hide schema", "Mostrar/ocultar schema", "Mostrar/ocultar esquema"]
  , ["shortcuts.runSql", "Run SQL", "Executar SQL", "Ejecutar SQL"]
  , ["shortcuts.newTab", "New SQL tab", "Nova aba SQL", "Nueva pestaña SQL"]
  , ["shortcuts.findEditor", "Find in editor", "Localizar no editor", "Buscar en el editor"]
  , ["database.newDescription", "Creates an empty SQLite file with no tables.", "Cria um arquivo SQLite vazio, sem tabelas.", "Crea un archivo SQLite vacío, sin tablas."]
  , ["database.newFileLabel", "New database filename", "Nome do novo arquivo de banco de dados", "Nombre del nuevo archivo de base de datos"]
  , ["database.newFilePlaceholder", "new-database.db", "novo-banco.db", "nueva-base.db"]
  , ["export.allFiltered", "All filtered rows", "Tabela toda filtrada", "Todas las filas filtradas"]
  , ["export.selected", "Selected rows", "Registros selecionados", "Filas seleccionadas"]
  , ["export.current", "Current row", "Registro corrente", "Fila actual"]
  , ["status.selectedSqlOnly", "Running only the selected SQL text...", "Executando apenas o trecho SQL selecionado...", "Ejecutando solo el fragmento SQL seleccionado..."]
  , ["tabs.presetUpdated", "The tab-name preset was updated for new tabs.", "O preset de nomes das abas foi atualizado para novas abas.", "El ajuste de nombres de pestaña se actualizó para las pestañas nuevas."]
  , ["runtime.loadingSqlJs", "Loading sql.js...", "Carregando sql.js...", "Cargando sql.js..."]
  , ["file.dropTextOnly", "Drop a text file such as .sql or .txt.", "Solte um arquivo textual, como .sql ou .txt.", "Suelte un archivo de texto, como .sql o .txt."]
  , ["recent.open", "Open", "Abrir", "Abrir"]
  , ["recent.cleared", "The recent-database list was cleared.", "A lista de bancos recentes foi limpa.", "Se borró la lista de bases de datos recientes."]
  , ["schema.filtersCleared", "Schema filters were cleared.", "Os filtros do schema foram limpos.", "Se borraron los filtros del esquema."]
  , ["results.sleepLabel", "No results", "Sem resultados", "Sin resultados"]
  , ["results.sleepTitle", "No results to display", "Nenhum resultado para exibir", "No hay resultados para mostrar"]
  , ["results.sleepDescription", "Open a SQLite database, write a query, and run it with F5.", "Abra um banco SQLite, escreva uma consulta e execute com F5.", "Abra una base de datos SQLite, escriba una consulta y ejecútela con F5."]
  , ["sqlMap.moreFields", "+ {count} more field(s)", "+ mais {count} campo(s)", "+ {count} campo(s) más"]
  , ["database.defaultNewBaseName", "new-database", "novo-banco", "nueva-base"]
  , ["file.defaultSqlName", "query.sql", "consulta.sql", "consulta.sql"]
  , ["results.csvFilename", "sqlite_result.csv", "resultado_sqlite.csv", "resultado_sqlite.csv"]
  , ["results.jsonFilename", "sqlite_result.json", "resultado_sqlite.json", "resultado_sqlite.json"]
  , ["sqlMap.pngFilenamePrefix", "sql-map-er", "mapa-sql-der", "mapa-sql-der"]
  , ["database.filePickerDescription", "SQLite database", "Banco de dados SQLite", "Base de datos SQLite"]
]);

export const I18N_ADDITIONAL_MESSAGES = Object.freeze(Object.fromEntries(
  SUPPORTED_LOCALES.map((locale, localeIndex) => [
    locale,
    Object.freeze(Object.fromEntries(I18N_MESSAGE_ROWS.map(row => [row[0], row[localeIndex + 1]])))
  ])
));
