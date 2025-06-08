// class Status(models.TextChoices):
//         SCHEDULED = "scheduled", "Scheduled"
//         IN_PROGRESS = "in_progress", "In Progress"
//         COMPLETED = "completed", "Completed"
//         CANCELED = "canceled", "Canceled"

//     class Type(models.TextChoices):
//         MULTI = "multi", "Multiple"
//         RECURRING = "recurring", "Recurring"

export enum WebinarSessionSeriesStatus {
    SCHEDULED = 'scheduled',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELED = 'canceled'
}

export enum WebinarSessionSeriesType {
    MULTI = 'multi',
    RECURRING = 'recurring'
}