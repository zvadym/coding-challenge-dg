function AtLeastTwice(users: { age: number }[]): boolean {
  // Returns true if any user is at least twice as old as any other user in the list.
  if (users.length < 2) return false;

  let minAge = users[0].age;
  let maxAge = users[0].age;

  for (const user of users) {
    minAge = Math.min(minAge, user.age);
    maxAge = Math.max(maxAge, user.age);
  }

  // O(n) time and O(1) space complexity.
  return maxAge >= minAge * 2;

  /* 
   // Another solution - looks nicer but O(n) space complexity.
   const ages = users.map((user) => user.age);
   const minAge = Math.min(...ages);
   const maxAge = Math.max(...ages);
   return maxAge >= minAge * 2;
   */
}

function ExactlyTwice(users: { age: number }[]): boolean {
  // Returns true if any user is exactly twice as old as any other user in the list.
  // Constraint: Must be O(n) time and O(n) space complexity.
  if (users.length < 2) return false;

  const seenAges = new Set<number>();

  for (const user of users) {
    const age = user.age;

    if (seenAges.has(age * 2) || (age % 2 === 0 && seenAges.has(age / 2))) {
      return true;
    }

    seenAges.add(age);
  }

  return false;
}

function ConstrainedExactlyTwice(users: { age: number }[]): boolean {
  // Returns true if any user is exactly twice as old as any other user in the list.
  // Guarantee: Ages are always between 18 and 80.
  // Constraint: Must achieve O(n) time (single pass) and O(1) space complexity.

  // When I was looking for a solution, I was a bit stuck at first,
  // and then I thought that maybe there was a way to use bitwise operations here.
  // This was my first idea, and I started implementing it.
  // And then I realized that in principle, just an array would be enough.
  // It is enough because its length is fixed — only 81 elements (actually 63).

  // Space: O(1), because seen is always fixed size
  const seen = Array<boolean>(81).fill(false);

  for (const user of users) {
    const age = user.age;

    if (age < 18 || age > 80) {
      continue;
    }

    if (age * 2 <= 80 && seen[age * 2]) {
      return true;
    }

    if (age % 2 === 0 && age / 2 >= 18 && seen[age / 2]) {
      return true;
    }

    seen[age] = true;
  }

  return false;
}

/*
function ConstrainedExactlyTwiceBitwise(users: { age: number }[]): boolean {
  // Bitwise operations are not my strong point, and in principle it is "overcomplicated".
  let seen = 0n;

  const bitForAge = (age: number): bigint => {
    return 1n << BigInt(age - 18);
  };

  const hasSeenAge = (age: number): boolean => {
    return (seen & bitForAge(age)) !== 0n;
  };

  for (const user of users) {
    const age = user.age;

    if (age * 2 <= 80 && hasSeenAge(age * 2)) {
      return true;
    }

    if (age % 2 === 0 && age / 2 >= 18 && hasSeenAge(age / 2)) {
      return true;
    }

    seen |= bitForAge(age);
  }

  return false;
}
*/

export { AtLeastTwice, ExactlyTwice, ConstrainedExactlyTwice };
