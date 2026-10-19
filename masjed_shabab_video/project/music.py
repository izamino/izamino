import numpy as np, wave, sys
sr=44100; D=94.0; n=int(sr*D); t=np.arange(n)/sr
out=np.zeros((n,2))
def hz(m): return 440*2**((m-69)/12)
# progression (midi roots + chord tones), 4 bars each 2 beats... 8s per chord
chords=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]  # Am F C G
seg=8.0
env_global=np.clip(t/3,0,1)*np.clip((D-t)/5,0,1)
# energy curve: lift in activities (8-58), calm narrator (58-62), hopeful build (62-88)
energy=np.interp(t,[0,7,10,56,60,63,75,86,90,94],[.35,.45,.8,.85,.4,.55,.8,1,.6,.3])
rng=np.random.default_rng(3)
for k in range(int(D/seg)+1):
    c=chords[k%4]; a=k*seg-1.0; b=a+seg+2.0
    i0=max(0,int(a*sr)); i1=min(n,int(b*sr)); tt=t[i0:i1]-a
    e=np.clip(tt/2.0,0,1)*np.clip((b-a-tt)/2.0,0,1)
    for j,m in enumerate(c):
        for det,pan in ((-0.07,.3),(0.07,.7)):
            f=hz(m-12 if j==0 else m)*(1+det/100)
            s=np.sin(2*np.pi*f*tt+j)*0.5+np.sin(2*np.pi*2*f*tt)*0.12
            out[i0:i1,0]+=s*e*(1-pan)*0.05; out[i0:i1,1]+=s*e*pan*0.05
# soft plucked arpeggio (santur-like) with decaying envelope
beat=60/76
k=0; tb=8.0
while tb<D-4:
    c=chords[int(tb//seg)%4]; m=c[[1,2,3,2,1,3,2,3][k%8]]+12
    i0=int(tb*sr); L=int(1.6*sr); i1=min(n,i0+L); tt=t[i0:i1]-tb
    f=hz(m); s=(np.sin(2*np.pi*f*tt)+.35*np.sin(2*np.pi*2.01*f*tt)+.15*np.sin(2*np.pi*3.02*f*tt))*np.exp(-tt*3.2)
    g=0.07*energy[i0]; pan=.35+.3*((k*7)%5)/4
    out[i0:i1,0]+=s*g*(1-pan); out[i0:i1,1]+=s*g*pan
    tb+=beat/2; k+=1
# low soft frame drum on beats in high-energy parts
tb=10.0
while tb<D-5:
    i0=int(tb*sr); L=int(.5*sr); i1=min(n,i0+L); tt=t[i0:i1]-tb
    s=np.sin(2*np.pi*(70+50*np.exp(-tt*30))*tt)*np.exp(-tt*9)
    g=0.18*max(0,energy[i0]-.5)
    out[i0:i1]+=s[:,None]*g
    tb+=beat
# simple stereo reverb (feedback delays)
for d,g in ((0.113,.35),(0.191,.28),(0.293,.22)):
    k=int(d*sr); 
    for ch,off in ((0,0),(1,int(0.017*sr))):
        y=out[:,ch].copy()
        for r in range(1,5):
            s=k*r+off; out[s:,ch]+=y[:-s]*(g**r)*0.6
out*=env_global[:,None]
out/=np.abs(out).max()/0.7
pcm=(out*32767).astype(np.int16)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes()); w.close()
