
DROP TRIGGER IF EXISTS trg_auto_advance_pipeline ON public.proposals;

CREATE TRIGGER trg_auto_advance_pipeline
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_advance_pipeline_on_publish();
