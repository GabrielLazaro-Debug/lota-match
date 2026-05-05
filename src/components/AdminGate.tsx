import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck } from "lucide-react";
import { changePassword, isAdmin, startSession, verifyPassword } from "@/lib/admin";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminGate({ open, onClose, onSuccess }: Props) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");

  useEffect(() => {
    if (!open) { setPwd(""); setCurr(""); setNext(""); setShowChange(false); }
  }, [open]);

  async function submit() {
    setLoading(true);
    const ok = await verifyPassword(pwd);
    setLoading(false);
    if (!ok) { toast.error("Senha incorreta"); return; }
    startSession();
    toast.success("Modo administrador ativado (4h)");
    onSuccess?.();
    onClose();
  }

  async function handleChange() {
    const ok = await changePassword(curr, next);
    if (!ok) { toast.error("Senha atual incorreta ou nova muito curta (mín. 4)"); return; }
    toast.success("Senha alterada com sucesso");
    setShowChange(false); setCurr(""); setNext("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Acesso administrador
          </DialogTitle>
          <DialogDescription>
            Necessário para importar planilhas, KML/KMZ e atualizar dados.
          </DialogDescription>
        </DialogHeader>

        {!showChange ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Senha</Label>
              <Input type="password" value={pwd} autoFocus
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••" />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Padrão inicial: <code>admin123</code> — altere assim que possível.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={loading || !pwd} className="flex-1">
                <Lock className="mr-1 h-4 w-4" />Entrar
              </Button>
              <Button variant="ghost" onClick={() => setShowChange(true)}>Alterar senha</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Senha atual</Label>
              <Input type="password" value={curr} onChange={(e) => setCurr(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Nova senha (mín. 4)</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleChange} disabled={!curr || !next} className="flex-1">Salvar</Button>
              <Button variant="ghost" onClick={() => setShowChange(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function useAdmin() {
  const [admin, setAdmin] = useState(isAdmin());
  useEffect(() => {
    const i = setInterval(() => setAdmin(isAdmin()), 5000);
    const onStorage = () => setAdmin(isAdmin());
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(i); window.removeEventListener("storage", onStorage); };
  }, []);
  return { admin, refresh: () => setAdmin(isAdmin()) };
}
