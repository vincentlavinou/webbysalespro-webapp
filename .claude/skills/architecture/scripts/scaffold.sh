#!/bin/bash
# Scaffold a new feature module following the architecture pattern.
# Usage: bash .claude/skills/architecture/scripts/scaffold.sh <module-name>
# Example: bash .claude/skills/architecture/scripts/scaffold.sh discount

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <module-name>"
  echo "Example: $0 discount"
  exit 1
fi

RAW="$1"
# Convert to PascalCase (e.g. "discount-code" -> "DiscountCode")
PASCAL=$(echo "$RAW" | sed -r 's/(^|[-_])(\w)/\U\2/g')
# Convert to kebab-case for hook files
KEBAB=$(echo "$RAW" | sed 's/_/-/g')

BASE="src/$RAW"

echo "Scaffolding module: $RAW (PascalCase: $PASCAL)"

mkdir -p "$BASE"/{context,provider,hooks,components/form,service}

# --- service/type.d.ts ---
cat > "$BASE/service/type.d.ts" <<EOF
export type ${PASCAL}Dto = {
    id: string;
    webinar_id: string;
    // TODO: add fields
};

export type Create${PASCAL}Dto = {
    // TODO: add request body fields (snake_case)
};

export type Update${PASCAL}Dto = {
    // TODO: add request body fields (snake_case)
};
EOF

# --- service/schemas.ts ---
cat > "$BASE/service/schemas.ts" <<EOF
import { z } from "zod";

export const create${PASCAL}Schema = z.object({
    webinarId: z.string().uuid(),
    // TODO: add form fields (camelCase)
});

export type ${PASCAL}FormValues = z.infer<typeof create${PASCAL}Schema>;

export const formDefault: ${PASCAL}FormValues = {
    webinarId: "",
    // TODO: add defaults
};
EOF

# --- service/action.ts ---
cat > "$BASE/service/action.ts" <<EOF
'use server'

import { actionClient } from "@/lib/safe-action";
import { getBaseApiUrl } from "@/service/core/environment";
import { postResource, getResource, patchResource } from "@/service/api/rest-api";
import { create${PASCAL}Schema } from "./schemas";
import type { ${PASCAL}Dto, Create${PASCAL}Dto } from "./type";

const baseApiUrl = getBaseApiUrl();

export const create${PASCAL}Action = actionClient
    .inputSchema(create${PASCAL}Schema)
    .action(async ({ parsedInput }) => {
        const { webinarId, ...rest } = parsedInput;
        const body: Create${PASCAL}Dto = {
            // TODO: map camelCase -> snake_case
        };
        return await postResource<${PASCAL}Dto>(
            \`\${baseApiUrl}/v2/webinars/\${webinarId}/TODO_ENDPOINT/\`,
            body
        );
    });
EOF

# --- context ---
cat > "$BASE/context/${PASCAL}Context.tsx" <<EOF
import { createContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ${PASCAL}FormValues } from "../service/schemas";
import type { ${PASCAL}Dto } from "../service/type";

export type ${PASCAL}ContextType = {
    form: UseFormReturn<${PASCAL}FormValues>;
    items: ${PASCAL}Dto[];
    selectedItem: ${PASCAL}Dto | undefined;
    isLoading: boolean;
    onSubmit: (values: ${PASCAL}FormValues) => void;
    resetToCreateMode: () => void;
};

export const ${PASCAL}Context = createContext<${PASCAL}ContextType | undefined>(undefined);
EOF

# --- provider ---
cat > "$BASE/provider/${PASCAL}Provider.tsx" <<'PROVEOF'
"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "react-hot-toast";
PROVEOF

cat >> "$BASE/provider/${PASCAL}Provider.tsx" <<EOF
import { ${PASCAL}Context } from "../context/${PASCAL}Context";
import { create${PASCAL}Schema, formDefault } from "../service/schemas";
import type { ${PASCAL}FormValues } from "../service/schemas";
import type { ${PASCAL}Dto } from "../service/type";
import { create${PASCAL}Action } from "../service/action";

interface ${PASCAL}ProviderProps {
    webinar: { id: string };
    initialItems: ${PASCAL}Dto[];
    children: React.ReactNode;
}

export function ${PASCAL}Provider({ webinar, initialItems, children }: ${PASCAL}ProviderProps) {
    const [items, setItems] = useState<${PASCAL}Dto[]>(initialItems ?? []);
    const [selectedItem, setSelectedItem] = useState<${PASCAL}Dto | undefined>();

    const form = useForm<${PASCAL}FormValues>({
        resolver: zodResolver(create${PASCAL}Schema),
        defaultValues: formDefault,
    });

    const { execute: executeCreate, isPending } = useAction(create${PASCAL}Action, {
        onSuccess({ data }) {
            if (data) setItems(prev => [data, ...prev]);
            toast.success("Created successfully.");
            form.reset(formDefault);
        },
        onError({ error: { serverError } }) {
            toast.error(serverError ?? "Something went wrong.");
        },
    });

    const onSubmit = (values: ${PASCAL}FormValues) => {
        executeCreate({ webinarId: webinar.id, ...values });
    };

    const resetToCreateMode = () => {
        setSelectedItem(undefined);
        form.reset(formDefault);
    };

    return (
        <${PASCAL}Context.Provider value={{ form, items, selectedItem, isLoading: isPending, onSubmit, resetToCreateMode }}>
            {children}
        </${PASCAL}Context.Provider>
    );
}
EOF

# --- hook ---
cat > "$BASE/hooks/use-${KEBAB}.tsx" <<EOF
import { useContext } from "react";
import { ${PASCAL}Context } from "../context/${PASCAL}Context";

export function use${PASCAL}() {
    const ctx = useContext(${PASCAL}Context);
    if (!ctx) throw new Error("use${PASCAL} must be used inside ${PASCAL}Provider");
    return ctx;
}
EOF

# --- Manager ---
cat > "$BASE/${PASCAL}Manager.tsx" <<EOF
"use client"

import { ${PASCAL}Provider } from "./provider/${PASCAL}Provider";
import type { ${PASCAL}Dto } from "./service/type";

interface ${PASCAL}ManagerProps {
    webinar: { id: string };
    initialItems: ${PASCAL}Dto[];
}

export function ${PASCAL}Manager({ webinar, initialItems }: ${PASCAL}ManagerProps) {
    return (
        <${PASCAL}Provider webinar={webinar} initialItems={initialItems || []}>
            <div className="grid gap-6">
                {/* TODO: Add components */}
            </div>
        </${PASCAL}Provider>
    );
}
EOF

# --- index.tsx ---
cat > "$BASE/index.tsx" <<EOF
export { ${PASCAL}Manager } from "./${PASCAL}Manager";
EOF

# --- components barrel ---
cat > "$BASE/components/index.tsx" <<EOF
// Export components here
EOF

cat > "$BASE/components/form/index.tsx" <<EOF
// Export form components here
EOF

echo ""
echo "Module '$RAW' scaffolded at $BASE/"
echo ""
echo "Next steps:"
echo "  1. Fill in service/type.d.ts with your DTOs"
echo "  2. Add form fields to service/schemas.ts"
echo "  3. Update service/action.ts endpoint and field mapping"
echo "  4. Build form components in components/form/"
echo "  5. Add page route in src/app/"
