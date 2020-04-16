use Data::Dumper;

my $dir = 'incoming/exportNsiItem';

opendir (DIR, $dir); my @files = grep {/xml$/} readdir (DIR); closedir DIR;

print "{\n";

my $is_virgin = 1;

foreach my $file (@files) {

	my ($guid) = split /\./, $file;

	my $path = "$dir/$file";

	open (F, $path) or die "Can't open $path: $!\n";
	
	while (my $line = <F>) {
	
		if ($line =~ /:RegistryNumber>(\d+)</) {
		
			if ($is_virgin) {
			
				$is_virgin = 0
			
			}
			else {
			
				print ",\n"
			
			}
		
			print qq{\t"$1":\t"$guid"};
		
		}				
	
	}
	
	close (F);

}

print "\n}";
