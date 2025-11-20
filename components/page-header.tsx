import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
}

/**
 * Page Header - Mobile-first component
 * Responsive typography and spacing for mobile and desktop
 */
export function PageHeader({
  title,
  description,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-3 md:pb-4", className)} {...props}>
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      <Separator className="my-3 md:my-4" />
    </div>
  )
}
