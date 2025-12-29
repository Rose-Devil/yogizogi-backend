try {
    console.log('Checking paths...');
    console.log('1. config/db');
    require('../src/config/db');
    console.log('PASS');

    // Load User first to see what it exports
    console.log('2. user.model');
    const User = require('../src/modules/user/user.model');
    console.log('User exports:', User);
    console.log('PASS');

    console.log('3. travelPost.model');
    require('../src/modules/post/travelPost.model');
    console.log('PASS');

    console.log('4. comment.model');
    require('../src/modules/interaction/comment.model');
    console.log('PASS');

} catch (e) {
    console.log('FAIL:', e.message);
    console.log(e.stack);
}
