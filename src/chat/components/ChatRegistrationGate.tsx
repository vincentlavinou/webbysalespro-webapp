'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { notifyErrorUiMessage, notifySuccessUiMessage } from '@/lib/notify';
import { claimJoinRegistrantAction } from '@/attendee-session/service/action';
import {
  claimRegistrantSchema,
  type ClaimRegistrantFormData,
} from '@/attendee-session/service/schema';
import { useChat } from '../hooks';
import { useChatRuntime } from '../hooks/use-chat-runtime';

const fieldClassName =
  'h-10 rounded-lg border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-primary focus-visible:ring-primary/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-primary';

/**
 * Shown in place of the composer for anonymous guests. Chat stays readable;
 * sending unlocks once they claim a real identity via /v2/join/claim/.
 */
export function ChatRegistrationGate() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { onRegistered } = useChatRuntime();
  const { disconnect, reconnectNow } = useChat();

  const form = useForm<ClaimRegistrantFormData>({
    resolver: zodResolver(claimRegistrantSchema),
  });

  const { execute, isPending } = useAction(claimJoinRegistrantAction, {
    onSuccess() {
      // The claim invalidates the join-session cache server-side; a reconnect
      // makes the room request a fresh token, which comes back send-capable
      // under the attendee's real name.
      onRegistered();
      disconnect();
      reconnectNow();
      notifySuccessUiMessage("You're all set — you can now chat.");
    },
    onError({ error }) {
      notifyErrorUiMessage(
        error.serverError?.detail,
        'Could not complete registration. Please try again.',
      );
    },
  });

  if (!isFormOpen) {
    return (
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5">
        <p className="text-sm text-muted-foreground">
          You&apos;re watching as a guest.
        </p>
        <Button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <MessageCircle className="mr-1.5 size-4" />
          Register to chat
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => execute(data))}
        className="mt-2 space-y-2 rounded-lg border px-3 py-3"
      >
        <p className="text-sm font-medium text-foreground">
          Register to join the conversation
        </p>

        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormLabel className="text-xs text-muted-foreground">First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane"
                    autoComplete="given-name"
                    disabled={isPending}
                    className={fieldClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormLabel className="text-xs text-muted-foreground">Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Doe"
                    autoComplete="family-name"
                    disabled={isPending}
                    className={fieldClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormLabel className="text-xs text-muted-foreground">Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  className={fieldClassName}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormLabel className="text-xs text-muted-foreground">Phone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  disabled={isPending}
                  className={fieldClassName}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setIsFormOpen(false)}
            className="h-10 flex-1 rounded-lg text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 flex-[2] rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:hover:bg-primary"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Registering…' : 'Register & Chat'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
