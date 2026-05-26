/**
 * Safe fetch utility with better error handling and retry logic
 */

type RetryOptions = {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
};

type ApiFetchOptions = RequestInit & RetryOptions;

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  delayMs: 500,
  backoffMultiplier: 2,
};

/**
 * Sleep for a given amount of time
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe fetch with retry logic and better error handling
 * @throws {Error} with descriptive message
 */
export async function safeFetch<T>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
    delayMs = DEFAULT_RETRY_OPTIONS.delayMs,
    backoffMultiplier = DEFAULT_RETRY_OPTIONS.backoffMultiplier,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let currentDelayMs = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, fetchOptions);

      // Handle non-OK responses
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          if (typeof data === "object" && data !== null && "error" in data) {
            errorMessage = String(data.error);
          }
        } catch {
          // If response is not JSON, use status text
          if (response.statusText) {
            errorMessage = response.statusText;
          }
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(errorMessage);
        }

        // Retry on server errors (5xx)
        if (attempt < maxRetries) {
          await sleep(currentDelayMs);
          currentDelayMs *= backoffMultiplier;
          continue;
        }

        throw new Error(errorMessage);
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      }

      // Handle empty responses (204 No Content, etc.)
      if (response.status === 204 || response.status === 205) {
        return {} as T;
      }

      // Try to parse as text if not JSON
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      throw new Error(`Unexpected response format: ${contentType || "unknown"}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on network errors in last attempt
      if (attempt < maxRetries) {
        await sleep(currentDelayMs);
        currentDelayMs *= backoffMultiplier;
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to fetch data after retries");
}

/**
 * Check if the server is reachable
 */
export async function checkApiHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/health`, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
