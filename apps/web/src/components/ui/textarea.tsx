// import * as React from "react"
// import { cn } from "@/lib/utils"

// const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
//   ({ className, ...props }, ref) => {
//     const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
//     const combinedRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef

//     const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
//       const target = e.currentTarget
//       target.style.height = "auto"
//       target.style.height = `${Math.min(target.scrollHeight, 160)}px` // cap at ~6 lines
//     }

//     React.useEffect(() => {
//       const el = combinedRef?.current
//       if (el) {
//         el.style.height = "auto"
//         el.style.height = `${Math.min(el.scrollHeight, 160)}px`
//       }
//     }, [props.value])

//     return (
//       <textarea
//         {...props}
//         ref={combinedRef}
//         onInput={(e) => {
//           handleInput(e)
//           props.onInput?.(e)
//         }}
//         rows={1}
//         maxLength={1000}
//         data-slot="textarea"
//         className={cn(
//           "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
//           "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
//           "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
//           className
//         )}
//         style={{
//           overflowY: "auto",  // allows scrolling after max height
//           resize: "none",     // prevent manual resizing
//         }}
//       />
//     )
//   }
// )

// Textarea.displayName = "Textarea"

// export { Textarea }

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  maxLength?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength = 1000, value = "", ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    const combinedRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef
    const [charCount, setCharCount] = React.useState(
      typeof value === "string" ? value.length : 0
    )

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.currentTarget
      target.style.height = "auto"
      target.style.height = `${Math.min(target.scrollHeight, 160)}px` // ~6 lines max
      setCharCount(target.value.length)
    }

    React.useEffect(() => {
      const el = combinedRef?.current
      if (el) {
        el.style.height = "auto"
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`
        setCharCount(el.value.length)
      }
    }, [value])

    return (
      <div className="relative w-full">
        <textarea
          {...props}
          ref={combinedRef}
          onInput={(e) => {
            handleInput(e)
            props.onInput?.(e)
          }}
          rows={1}
          maxLength={maxLength}
          value={value}
          data-slot="textarea"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
          )}
          style={{
            height: "36px",
            overflowY: "auto",
            resize: "none",
            minHeight: "auto",
          }}
        />

        {/* 🔹 Character counter */}
        <span
          className={cn(
            "absolute bottom-1 right-3 text-xs",
            charCount >= maxLength * 0.995
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {charCount}/{maxLength}
        </span>
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
