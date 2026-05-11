package password

import "testing"

func TestHashAndVerify(t *testing.T) {
	hash, err := Hash("correct-horse-1")
	if err != nil {
		t.Fatalf("Hash() error = %v", err)
	}

	verified, err := Verify("correct-horse-1", hash)
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if !verified {
		t.Fatal("expected password to verify")
	}

	verified, err = Verify("wrong-password", hash)
	if err != nil {
		t.Fatalf("Verify() wrong password error = %v", err)
	}
	if verified {
		t.Fatal("expected wrong password to fail")
	}
}

func TestVerifyRejectsInvalidHash(t *testing.T) {
	verified, err := Verify("password", "not-a-real-hash")
	if err == nil {
		t.Fatal("expected invalid hash error")
	}
	if verified {
		t.Fatal("invalid hash should not verify")
	}
}
