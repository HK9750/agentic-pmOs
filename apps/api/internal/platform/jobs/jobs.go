package jobs

import "context"

type Job struct {
	Type    string
	Payload []byte
}

type Runner interface {
	Enqueue(context.Context, Job) error
}

type InlineRunner struct {
	Handlers map[string]func(context.Context, []byte) error
}

func (r InlineRunner) Enqueue(ctx context.Context, job Job) error {
	if r.Handlers == nil || r.Handlers[job.Type] == nil {
		return nil
	}
	return r.Handlers[job.Type](ctx, job.Payload)
}
