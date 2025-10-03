// Script to fix all params in Next.js 15 dynamic routes
// In Next.js 15, params is now a Promise and must be awaited

const fs = require('fs');
const path = require('path');

const fixes = [
  // Single param routes
  {
    file: 'src/app/api/entries/[id]/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string } }',
        to: '{ params }: { params: Promise<{ id: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      }
    ]
  },
  {
    file: 'src/app/api/loans/[id]/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string } }',
        to: '{ params }: { params: Promise<{ id: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      }
    ]
  },
  {
    file: 'src/app/api/loans/[id]/payments/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string } }',
        to: '{ params }: { params: Promise<{ id: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      }
    ]
  },
  {
    file: 'src/app/api/loans/[id]/comments/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string } }',
        to: '{ params }: { params: Promise<{ id: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      }
    ]
  },
  {
    file: 'src/app/api/notifications/[id]/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string } }',
        to: '{ params }: { params: Promise<{ id: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      }
    ]
  },
  // Double param routes
  {
    file: 'src/app/api/loans/[id]/payments/[paymentId]/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string; paymentId: string } }',
        to: '{ params }: { params: Promise<{ id: string; paymentId: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      },
      {
        from: 'params.paymentId',
        to: '(await params).paymentId',
      }
    ]
  },
  {
    file: 'src/app/api/loans/[id]/comments/[commentId]/route.ts',
    changes: [
      {
        from: '{ params }: { params: { id: string; commentId: string } }',
        to: '{ params }: { params: Promise<{ id: string; commentId: string }> }',
      },
      {
        from: 'params.id',
        to: '(await params).id',
      },
      {
        from: 'params.commentId',
        to: '(await params).commentId',
      }
    ]
  },
];

console.log('Fixing Next.js 15 params...\n');

fixes.forEach(({ file, changes }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  changes.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️  Skipped (already fixed): ${file}`);
  }
});

console.log('\n✅ All params fixed!');
