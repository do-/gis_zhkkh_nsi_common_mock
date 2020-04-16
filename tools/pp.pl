use Data::Dumper;

chdir '..';

my $dir = 'svc/xml';

opendir (DIR, $dir); my @files = grep {/xml$/} readdir (DIR); closedir DIR;

print "{\n";

my $is_virgin = 1;

foreach my $file (@files) {

	my ($guid) = split /\./, $file;

	my $path = "$dir/$file";

	open (F, $path) or die "Can't open $path: $!\n";
	
	my $code;
	
	while (my $line = <F>) {
	
		if (!$code && $line =~ /NsiItemRegistryNumber/ && $line =~ />(\d+)</) {
		
			$code = $1;

		}
	
		if ($line =~ /CurrentPage/ && $line =~ />(\d+)</) {
		
			if ($is_virgin) {
			
				$is_virgin = 0
			
			}
			else {
			
				print ",\n"
			
			}

			print qq {"${code}_${1}": "$guid"};

		}

	}
	
	close (F);

}

print "\n}";
