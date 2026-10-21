import re,sys
src,dst=sys.argv[1:3]
h=open(src).read()
m=re.search(r'<main><div>(.*)</div></main>',h,re.S)
if not m: print('NO-MATCH'); sys.exit(2)
inner=m.group(1);blocks=[];depth=0;start=None
for t in re.finditer(r'</?div\b[^>]*>',inner):
    if t.group(0).startswith('</'):
        depth-=1
        if depth==0: blocks.append(inner[start:t.end()])
    else:
        if depth==0: start=t.start()
        depth+=1
secs=[]
for b in blocks:
    if re.match(r'<div class="section-metadata"',b) and secs: secs[-1]+=b
    else: secs.append(b)
open(dst,'w').write(h[:m.start()]+'<main>'+''.join('<div>'+s+'</div>' for s in secs)+'</main>'+h[m.end():])
print(len(secs))
