export const unstable_cache = <T extends (...a: any[]) => any>(fn: T) => fn;
export const revalidateTag = () => undefined;
export const revalidatePath = () => undefined;
