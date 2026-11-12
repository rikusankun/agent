"use client";

import { ClientError, type MessagePart } from "eve/client";
import {
  activeTurn,
  activity,
  failure,
  interaction,
  interactions,
  turns,
  type Activity,
} from "eve/events";
import { useEveAgent } from "eve/react";
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  BrainIcon,
  HeartIcon,
  ListTodoIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  SquareIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { cn } from "@/lib/utils";
import { type FreeModel, DEFAULT_FREE_MODEL_ID, FREE_MODELS } from "@/lib/free-models";
import { AgentMessage } from "./agent-message";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";

const DEFAULT_AGENT_NAME = "agent";
const AGENT_NAME = WEB_CHAT_AGENT ?? DEFAULT_AGENT_NAME;
const MODEL_STORAGE_KEY = "eve:free-model";
const MODEL_HEADER = "x-eve-model";

const STARTERS = [
  {
    icon: ListTodoIcon,
    label: "理一理今天的任务",
    prompt: "帮我理一理今天的任务，按优先级排一下",
  },
  { icon: RotateCcwIcon, label: "复盘这一周", prompt: "带我复盘一下这周，先给结论" },
  {
    icon: SparklesIcon,
    label: "拆一个大目标",
    prompt: "帮我拆一个大目标，给出步骤和大概耗时",
  },
  { icon: HeartIcon, label: "有点累，想聊聊", prompt: "今天有点累，想聊聊" },
] as const;

export function AgentChat({
  sessionId,
  sessionless = false,
  modelsEnabled = false,
  localModels = [],
  defaultModelId = DEFAULT_FREE_MODEL_ID,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly modelsEnabled?: boolean;
  readonly localModels?: readonly FreeModel[];
  readonly defaultModelId?: string;
}) {
  const modelOptions = useMemo(() => [...FREE_MODELS, ...localModels], [localModels]);
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [modelId, setModelId] = useState(defaultModelId);
  const modelRef = useRef(modelId);
  modelRef.current = modelId;
  const hasSubmittedMessage = useRef(false);

  useEffect(() => {
    if (!modelsEnabled) return;
    const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved && modelOptions.some((model) => model.id === saved)) setModelId(saved);
  }, [modelsEnabled, modelOptions]);

  const selectModel = (id: string) => {
    if (!modelOptions.some((model) => model.id === id)) return;
    setModelId(id);
    window.localStorage.setItem(MODEL_STORAGE_KEY, id);
  };
  const replaceSessionRoute = (nextSessionId: string) => {
    if (sessionId !== undefined) return;
    // Framework routers (Next.js, TanStack Router) patch window.history; navigating
    // through them would remount this route and detach the active stream.
    History.prototype.replaceState.call(
      window.history,
      window.history.state,
      "",
      `/s/${encodeURIComponent(nextSessionId)}`,
    );
  };
  const agent = useEveAgent({
    agent: WEB_CHAT_AGENT,
    headers: (): Readonly<Record<string, string>> =>
      modelsEnabled ? { [MODEL_HEADER]: modelRef.current } : {},
    prewarm: hasInputText,
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (hasSubmittedMessage.current && session !== undefined) {
        replaceSessionRoute(session.sessionId);
      }
    },
  });

  const isBusy = agent.status === "busy";
  // A turn waiting on a person is open while the store is idle; it still takes steering and Stop.
  const turnOpen = activeTurn(agent.view) !== undefined;
  const isResuming = agent.status === "resuming";
  const isEmpty = agent.messages.length === 0;
  const lastMessage = agent.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" && lastMessage.parts.length === 0;
  const now = activity(agent.view);
  // Show what the agent is doing until its message has something to show, unless it waits on you.
  const showPendingThinking =
    isBusy &&
    now.kind !== "waiting-on-interaction" &&
    (lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const failed =
    isBusy || isResuming ? undefined : failure(agent.view, turns(agent.view).at(-1)?.turnId);
  const turnFailure =
    failed?.code === "MODEL_CALL_FAILED"
      ? "The model is temporarily unavailable. Please try again."
      : failed?.message;
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const hasConversationContent = sessionless || !isEmpty || errorMessage !== undefined;
  const showConversationLayout = isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;
  // A session that ended outside eve never settles its requests, so they stay open, yet it
  // accepts no answer. Once the server says so, stop offering them.
  const sessionEnded =
    agent.error instanceof ClientError && agent.error.code === "session_not_active";
  // Answers are accepted while work runs; the server's settlement closes each request.
  const canRespond = (interactionId: string) =>
    !isResuming && !sessionEnded && interaction(agent.view, interactionId)?.status === "open";
  // A tool call can ask several questions at once, and its message part holds only the latest.
  const questionsFor = (callId: string) =>
    interactions(agent.view).filter(
      (input) => input.request.kind === "question" && input.call?.callId === callId,
    );

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isResuming) return;

    setHasInputText(false);
    setCancellationError(undefined);
    hasSubmittedMessage.current = true;
    if (agent.session !== undefined) replaceSessionRoute(agent.session.sessionId);
    const options = turnOpen ? { turnPolicy: "steer" as const } : undefined;

    if (message.files.length === 0) {
      await agent.send(text, options);
      return;
    }

    const parts: MessagePart[] = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send(parts, options);
  };

  const startWith = (prompt: string) => {
    if (isResuming || isBusy) return;
    void handleSubmit({ text: prompt, files: [] });
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        disabled={isResuming}
        onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
        placeholder="Send a message…"
      />
      <ComposerAction
        hasInputText={hasInputText}
        canCancel={turnOpen}
        isResuming={isResuming}
        onCancel={requestCancellation}
      />
    </PromptInput>
  );

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {showConversationLayout ? null : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="hero-glow absolute top-[16%] left-1/2 size-[34rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
          <div className="hero-grid absolute inset-0 opacity-30" />
        </div>
      )}
      {showConversationLayout ? (
        <ChatHeader canStartNewChat={activeSessionId !== undefined} />
      ) : null}

      {showConversationLayout ? (
        <Conversation
          className="min-h-0 flex-1"
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? "smooth" : "instant"}
          scrollRestorationKey={
            isEmpty || activeSessionId === undefined
              ? undefined
              : `eve:web-chat-scroll:${activeSessionId}`
          }
        >
          <ConversationTopFade className="top-14" />
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-20 pb-36 sm:px-6">
            {agent.messages.map((message) =>
              showPendingThinking &&
              isPendingAssistantShell &&
              message.id === lastMessage.id ? null : (
                <AgentMessage
                  canRespond={canRespond}
                  key={message.id}
                  message={message}
                  questionsFor={questionsFor}
                  view={agent.view}
                  onAnswers={async (answers) => {
                    setCancellationError(undefined);
                    await agent.respond(answers).catch((cause: unknown) => {
                      setCancellationError(
                        cause instanceof Error ? cause.message : "Unable to submit the answer.",
                      );
                    });
                  }}
                />
              ),
            )}
            {showPendingThinking ? <PendingActivity activity={now} /> : null}
            {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          "relative z-10 mx-auto w-full px-4 sm:px-6",
          showConversationLayout
            ? "fixed bottom-0 left-1/2 z-20 max-w-3xl -translate-x-1/2 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6"
            : "flex max-w-2xl flex-1 flex-col items-center justify-center gap-7 pb-[8vh]",
        )}
      >
        {showConversationLayout ? null : (
          <div className="flex w-full flex-col items-center gap-7 text-center">
            <div className="relative">
              <div className="absolute -inset-5 rounded-full bg-brand/20 blur-2xl" />
              <div className="relative flex size-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand-soft text-brand">
                <SparklesIcon className="size-6" />
              </div>
            </div>
            <div className="space-y-2.5">
              <h1 className="font-medium text-4xl tracking-tight sm:text-5xl">
                今天想从哪件事开始？
              </h1>
              <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                拆任务、排优先级、复盘；或者只是想有人听你说说话。
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTERS.map(({ icon: Icon, label, prompt }) => (
                <button
                  className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-4 py-3 text-left text-sm transition-colors hover:border-brand/40 hover:bg-card disabled:opacity-50"
                  disabled={isResuming || isBusy}
                  key={label}
                  onClick={() => startWith(prompt)}
                  type="button"
                >
                  <Icon className="size-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}
        {modelsEnabled ? (
          <ModelPicker onChange={selectModel} options={modelOptions} value={modelId} />
        ) : null}
        <div className="w-full">{composer}</div>
      </div>
    </main>
  );
}

function ComposerAction({
  hasInputText,
  canCancel,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly canCancel: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;

  if (!canCancel || canSubmit) {
    return <PromptInputSubmit disabled={isResuming} />;
  }

  return (
    <PromptInputButton
      aria-label="Stop"
      className="absolute right-2.5 bottom-2.5"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className="flex w-full items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Request failed</p>
            <p className="mt-0.5 text-muted-foreground">{message}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function ChatHeader({ canStartNewChat }: { readonly canStartNewChat: boolean }) {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-20 h-14">
      <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center bg-background px-24">
        <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
        {canStartNewChat ? (
          <Button
            aria-label="Start a new chat"
            className="pointer-events-auto fixed top-3 right-6 pr-4"
            onClick={() => window.location.assign("/s")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon className="size-4" />
            <span className="hidden font-normal text-sm sm:inline">New chat</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function PendingActivity({ activity }: { readonly activity: Activity }) {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <Trace>
          <TraceLine status="running">
            <TraceIcon>
              <BrainIcon />
            </TraceIcon>
            <TraceTitle>{activityLabel(activity)}</TraceTitle>
          </TraceLine>
        </Trace>
      </MessageContent>
    </Message>
  );
}

function activityLabel(activity: Activity): string {
  switch (activity.kind) {
    case "calling":
      return activity.names.join(", ");
    case "waiting-on-tasks":
      return `Waiting on ${activity.tasks.map((task) => task.name).join(", ")}`;
    case "compacting":
      return "Compacting the conversation";
    default:
      return "Thinking";
  }
}

function ModelPicker({
  value,
  onChange,
  options,
}: {
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly options: readonly FreeModel[];
}) {
  // Radix unmounts SelectContent while closed, so SelectValue cannot resolve the
  // selected item's text on first paint. Render the label explicitly instead.
  const selected = options.find((model) => model.id === value);
  return (
    <div className="mb-2 flex w-full items-center justify-center gap-2 text-muted-foreground text-xs">
      <span className="shrink-0">模型</span>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger className="h-7 w-auto max-w-[18rem] min-w-[10rem] gap-1 border-border/70 bg-card/60 px-2 text-xs">
          <SelectValue placeholder="选择模型">{selected?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}
